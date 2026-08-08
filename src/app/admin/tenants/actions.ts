'use server';

/**
 * @fileoverview Control Plane server actions for tenant lifecycle.
 * Every action verifies the caller is a platform operator (custom claim
 * `platformAdmin`) via the ID token — never trusting client-supplied identity.
 *
 * Provisioning a tenant is an asynchronous, multi-step process:
 *   provisioning → (create DB → deploy rules → seed → admin user) → active | failed
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { adminAuth, adminDb, getTenantDb } from '@/firebase/admin';
import { requirePlatformAdmin, setTenantClaims, clearTenantClaims } from '@/firebase/claims';
import {
  createFirestoreDatabase,
  waitForOperation,
  deployFirestoreRules,
  deleteFirestoreDatabase,
} from '@/firebase/gcp-firestore-admin';
import { slugify } from '@/lib/slug';
import { logPlatformAudit } from '@/lib/platform-audit';
import { addCycle, planPriceFor, isOverdue, type BillingCycle } from '@/lib/billing';
import type { TenantStatus, TenantBilling } from '@/lib/types';

const ProvisionInput = z.object({
  idToken: z.string().min(1),
  displayName: z.string().min(2),
  companyName: z.string().min(2),
  city: z.string().optional(),
  plan: z.string().min(1),
  /** Ciclo de facturación elegido al crear el tenant. */
  billingCycle: z.enum(['monthly', 'semiannual', 'annual']).default('monthly'),
  /** Firestore location for the new database (must match project constraints). */
  locationId: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFullName: z.string().min(2),
});

export type ProvisionTenantInput = z.infer<typeof ProvisionInput>;

/** Default seed data for a brand-new tenant database. */
const DEFAULT_LISTS: Record<string, { name: string; items: string[] }> = {
  campaignStatuses: { name: 'Estados de Campaña', items: ['Futura', 'En Campaña', 'Finalizada', 'Archivada'] },
  taskPriorities: { name: 'Prioridades de Tareas', items: ['normal', 'alta', 'urgente'] },
  taskStatuses: { name: 'Estados de Tareas', items: ['pendiente', 'en_curso', 'finalizada', 'archivada'] },
  identificationTypes: { name: 'Tipos de Documento', items: ['cedula_ciudadania', 'cedula_extranjeria', 'pasaporte'] },
  campaignTypes: { name: 'Tipos de Campaña', items: ['presidencia', 'alcaldia', 'gobernacion'] },
};

const ADMIN_PERMISSIONS = [
  'campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete',
  'voter:create', 'voter:read', 'voter:update', 'voter:delete',
  'user:create', 'user:read', 'user:update', 'user:delete',
  'role:create', 'role:read', 'role:update', 'role:delete',
  'city:create', 'city:read', 'city:update', 'city:delete',
  'task:create', 'task:read', 'task:update', 'task:delete',
  'call:create', 'call:read', 'call:update', 'call:delete',
  'form:create', 'form:read', 'form:update', 'form:delete',
  // `log:read` (auditoría) es exclusivo de la administración de plataforma; los
  // tenants no lo llevan.
  'report:read', 'setting:update',
];

/** Reads the tenant rules template and binds it to a concrete tenant id. */
function buildTenantRules(tenantId: string): string {
  const template = readFileSync(join(process.cwd(), 'firestore.tenant.rules'), 'utf8');
  return template.replace(/__TENANT_ID__/g, tenantId);
}

/**
 * Provisions a brand-new tenant: dedicated Firestore database, security rules,
 * seed data, and an initial admin user. Idempotency is guarded by the tenant
 * doc id (fails fast if it already exists).
 */
export async function provisionTenant(
  raw: ProvisionTenantInput
): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  let parsed: ProvisionTenantInput;
  let caller: { uid: string; email?: string } = { uid: '' };
  try {
    parsed = ProvisionInput.parse(raw);
    caller = await requirePlatformAdmin(parsed.idToken);
  } catch (e: any) {
    return { success: false, error: e?.message || 'Solicitud inválida.' };
  }

  const tenantId = slugify(parsed.displayName);
  if (tenantId.length < 4) {
    return { success: false, error: 'El nombre del tenant es demasiado corto.' };
  }
  const databaseId = `tenant-${tenantId}`;
  const tenantRef = adminDb.collection('tenants').doc(tenantId);

  // Guard against duplicates.
  if ((await tenantRef.get()).exists) {
    return { success: false, error: `Ya existe un tenant con id "${tenantId}".` };
  }

  // Módulos del plan (denormalizados para el gating sin lecturas ni reglas
  // extra). Si el plan aún no existe, se omite → backward-compat: el tenant
  // vería todos los módulos hasta que se le asigne un plan con módulos.
  const planSnap = await adminDb.collection('plans').doc(parsed.plan).get();
  const planData = planSnap.exists
    ? (planSnap.data() as {
        modules?: string[];
        maxUsers?: number;
        maxRoles?: number;
        maxCampaigns?: number;
        prices?: { monthly?: number; semiannual?: number; annual?: number };
        currency?: string;
      } | undefined)
    : undefined;
  const planModules = planData?.modules;
  const maxUsers = planData?.maxUsers;
  const maxRoles = planData?.maxRoles;
  const maxCampaigns = planData?.maxCampaigns;

  // Facturación: monto heredado del plan según el ciclo; el primer ciclo va
  // incluido desde createdAt (paidThrough = createdAt + ciclo → nace "al día").
  const createdAt = new Date().toISOString();
  const cycle = parsed.billingCycle as BillingCycle;
  const billing: TenantBilling = {
    cycle,
    amount: planPriceFor(planData?.prices, cycle),
    currency: (planData?.currency || 'COP').toUpperCase(),
    paidThrough: addCycle(createdAt, cycle),
    status: 'al_dia',
  };

  // 0) Register as provisioning so the UI can reflect progress.
  await tenantRef.set({
    displayName: parsed.displayName,
    companyName: parsed.companyName,
    ...(parsed.city ? { city: parsed.city } : {}),
    plan: parsed.plan,
    ...(Array.isArray(planModules) ? { planModules } : {}),
    ...(typeof maxUsers === 'number' ? { maxUsers } : {}),
    ...(typeof maxRoles === 'number' ? { maxRoles } : {}),
    ...(typeof maxCampaigns === 'number' ? { maxCampaigns } : {}),
    billing,
    databaseId,
    ownerUid: '',
    createdAt,
    status: 'provisioning' as TenantStatus,
  });

  try {
    // 1) Create the dedicated database and wait until it is usable.
    const opName = await createFirestoreDatabase(databaseId, parsed.locationId);
    await waitForOperation(opName);

    // 2) Deploy the tenant security rules bound to this tenant id.
    await deployFirestoreRules(databaseId, buildTenantRules(tenantId));

    // 3) Create the initial admin Auth user.
    const userRecord = await adminAuth.createUser({
      email: parsed.adminEmail,
      password: parsed.adminPassword,
      displayName: parsed.adminFullName,
      emailVerified: false,
      disabled: false,
    });

    // 4) Seed the tenant database (admin role, admin profile, default lists).
    const db = getTenantDb(databaseId);
    const batch = db.batch();

    batch.set(db.collection('roles').doc('admin'), {
      name: 'Admin',
      permissions: ADMIN_PERMISSIONS,
      status: 'activo',
    });

    const [firstName, ...rest] = (parsed.adminFullName || 'Admin').split(' ');
    batch.set(db.collection('users').doc(userRecord.uid), {
      firstName,
      lastName: rest.join(' '),
      email: parsed.adminEmail,
      roleId: 'admin',
      idType: 'admin',
      idNumber: '00000000',
      phone: '0000000000',
      cityIds: [],
      campaignIds: [],
      avatar: `https://picsum.photos/seed/${userRecord.uid}/100/100`,
      status: 'activo',
    });

    for (const [key, value] of Object.entries(DEFAULT_LISTS)) {
      batch.set(db.collection('lists').doc(key), value);
    }
    await batch.commit();

    // 5) Bind the admin user to this tenant via custom claims.
    await setTenantClaims(userRecord.uid, tenantId, 'admin');

    // 6) Mark active.
    await tenantRef.update({ status: 'active' as TenantStatus, ownerUid: userRecord.uid });

    await logPlatformAudit(caller, 'tenant:create', { tenantId, plan: parsed.plan });
    return { success: true, tenantId };
  } catch (error: any) {
    console.error(`Provisioning failed for tenant "${tenantId}":`, error?.message);
    // Leave a clear failed state for operator remediation (DB/user may need cleanup).
    await tenantRef.update({ status: 'failed' as TenantStatus }).catch(() => {});
    return { success: false, error: error?.message || 'Falló el aprovisionamiento del tenant.' };
  }
}

/** Updates a tenant's branding (logos / images / colors). Control Plane only. */
export async function updateTenantBranding(input: {
  idToken: string;
  tenantId: string;
  branding: {
    primaryColor?: string;
    accentColor?: string;
    sidebarColor?: string;
    logoUrl?: string;
    // La imagen de login es GLOBAL (settings/branding en (default)), no por
    // tenant. Se gestiona en /admin/branding.
  };
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    // Drop undefined keys so we never overwrite with undefined.
    const branding = Object.fromEntries(
      Object.entries(input.branding).filter(([, v]) => v !== undefined && v !== '')
    );
    await adminDb.collection('tenants').doc(input.tenantId).set({ branding }, { merge: true });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo actualizar el branding.' };
  }
}

/**
 * Asigna (o cambia) el plan de un tenant y DENORMALIZA sus módulos
 * (`planModules`) desde el documento del plan. Solo operador de plataforma.
 */
export async function changeTenantPlan(input: {
  idToken: string;
  tenantId: string;
  plan: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);
    const planSnap = await adminDb.collection('plans').doc(input.plan).get();
    if (!planSnap.exists) return { success: false, error: 'El plan seleccionado no existe.' };
    const planData = planSnap.data() as {
      modules?: string[];
      maxUsers?: number;
      maxRoles?: number;
      maxCampaigns?: number;
      prices?: { monthly?: number; semiannual?: number; annual?: number };
      currency?: string;
    } | undefined;
    const modules = planData?.modules || [];
    const maxUsers = planData?.maxUsers ?? 0;
    const maxRoles = planData?.maxRoles ?? 0;
    const maxCampaigns = planData?.maxCampaigns ?? 0;

    // Recalcular el monto de facturación con el precio del nuevo plan para el
    // ciclo ACTUAL del tenant (sin tocar paidThrough ni el estado).
    const tenantRef = adminDb.collection('tenants').doc(input.tenantId);
    const currentCycle = (tenantRef && (await tenantRef.get()).data() as { billing?: { cycle?: BillingCycle } } | undefined)?.billing?.cycle;
    const billingUpdate = currentCycle
      ? { 'billing.amount': planPriceFor(planData?.prices, currentCycle), 'billing.currency': (planData?.currency || 'COP').toUpperCase() }
      : {};

    await tenantRef.update({ plan: input.plan, planModules: modules, maxUsers, maxRoles, maxCampaigns, ...billingUpdate });
    await logPlatformAudit(caller, 'tenant:change_plan', { tenantId: input.tenantId, plan: input.plan });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo cambiar el plan.' };
  }
}

/**
 * Actualiza datos editables del tenant (nombre visible, empresa, ciudad). No
 * toca id/base de datos/plan/estado. Útil para asignar la ciudad a tenants
 * creados antes del campo. Solo operador de plataforma.
 */
export async function updateTenant(input: {
  idToken: string;
  tenantId: string;
  displayName?: string;
  companyName?: string;
  city?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);
    const update: Record<string, unknown> = {};
    if (typeof input.displayName === 'string' && input.displayName.trim().length >= 2) update.displayName = input.displayName.trim();
    if (typeof input.companyName === 'string' && input.companyName.trim().length >= 2) update.companyName = input.companyName.trim();
    if (typeof input.city === 'string') update.city = input.city; // permite fijar o limpiar
    if (Object.keys(update).length === 0) return { success: true };

    await adminDb.collection('tenants').doc(input.tenantId).update(update);
    await logPlatformAudit(caller, 'tenant:update_info', { tenantId: input.tenantId, ...update });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo actualizar el tenant.' };
  }
}

/** Activates or deactivates a tenant. Deactivating blocks its users at login. */
export async function setTenantStatus(input: {
  idToken: string;
  tenantId: string;
  status: Extract<TenantStatus, 'active' | 'inactive'>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);

    // No se puede ACTIVAR un tenant con facturación vencida: hay que registrar el
    // pago (que lo reactiva). Evita el conflicto de activarlo aquí y que el
    // barrido de cobros lo vuelva a suspender.
    if (input.status === 'active') {
      const snap = await adminDb.collection('tenants').doc(input.tenantId).get();
      const billing = (snap.data() as { billing?: TenantBilling } | undefined)?.billing;
      if (billing && isOverdue(billing.paidThrough)) {
        return {
          success: false,
          error: 'No se puede activar: la facturación está vencida. Registra el pago en Facturación y el tenant se reactivará automáticamente.',
        };
      }
    }

    await adminDb.collection('tenants').doc(input.tenantId).update({ status: input.status });
    await logPlatformAudit(caller, 'tenant:set_status', { tenantId: input.tenantId, status: input.status });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo actualizar el estado del tenant.' };
  }
}

/**
 * Assigns (or reassigns) an existing Auth user to a tenant with a role.
 * Enforces the "one active tenant per user" rule: clears prior claims first.
 */
export async function assignUserToTenant(input: {
  idToken: string;
  uid: string;
  tenantId: string;
  roleId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    await clearTenantClaims(input.uid);
    await setTenantClaims(input.uid, input.tenantId, input.roleId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo asignar el usuario al tenant.' };
  }
}

/**
 * DESTRUCTIVO: elimina un tenant por completo.
 *   1) borra su base de datos dedicada (y TODOS sus datos),
 *   2) borra el usuario admin dueño en Auth (si existe),
 *   3) borra el documento del registro en `(default)/tenants/{id}`.
 *
 * Es best-effort en los pasos 1 y 2 (si la DB o el usuario ya no existen se
 * continúa), pero SIEMPRE elimina el documento de registro al final.
 * Solo invocable por un operador de plataforma.
 */
export async function deleteTenant(input: {
  idToken: string;
  tenantId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);

    const ref = adminDb.collection('tenants').doc(input.tenantId);
    const snap = await ref.get();
    if (!snap.exists) {
      return { success: false, error: 'El tenant no existe.' };
    }
    const data = snap.data() as { databaseId?: string; ownerUid?: string } | undefined;

    // 1) Borrar la base de datos dedicada (asíncrono).
    if (data?.databaseId && data.databaseId !== '(default)') {
      try {
        const opName = await deleteFirestoreDatabase(data.databaseId);
        if (opName) await waitForOperation(opName);
      } catch (e: any) {
        console.error(`No se pudo borrar la DB "${data.databaseId}":`, e?.message);
        // No abortamos: puede que la DB no exista (tenant a medio aprovisionar).
      }
    }

    // 2) Borrar el usuario admin dueño en Auth (si lo hubo).
    if (data?.ownerUid) {
      try {
        await adminAuth.deleteUser(data.ownerUid);
      } catch (e: any) {
        console.error(`No se pudo borrar el usuario ${data.ownerUid}:`, e?.message);
      }
    }

    // 3) Borrar el registro del tenant.
    await ref.delete();

    await logPlatformAudit(caller, 'tenant:delete', { tenantId: input.tenantId });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo eliminar el tenant.' };
  }
}
