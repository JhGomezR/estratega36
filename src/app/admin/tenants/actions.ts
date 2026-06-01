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
} from '@/firebase/gcp-firestore-admin';
import { slugify } from '@/lib/slug';
import type { TenantStatus } from '@/lib/types';

const ProvisionInput = z.object({
  idToken: z.string().min(1),
  displayName: z.string().min(2),
  companyName: z.string().min(2),
  plan: z.enum(['basico', 'estratega', '360']),
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
  'report:read', 'setting:update', 'log:read',
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
  try {
    parsed = ProvisionInput.parse(raw);
    await requirePlatformAdmin(parsed.idToken);
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

  // 0) Register as provisioning so the UI can reflect progress.
  await tenantRef.set({
    displayName: parsed.displayName,
    companyName: parsed.companyName,
    plan: parsed.plan,
    databaseId,
    ownerUid: '',
    createdAt: new Date().toISOString(),
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
    loginImageUrl?: string;
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

/** Activates or deactivates a tenant. Deactivating blocks its users at login. */
export async function setTenantStatus(input: {
  idToken: string;
  tenantId: string;
  status: Extract<TenantStatus, 'active' | 'inactive'>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    await adminDb.collection('tenants').doc(input.tenantId).update({ status: input.status });
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
