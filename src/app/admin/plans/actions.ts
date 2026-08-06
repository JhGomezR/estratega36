'use server';

/**
 * Control Plane — gestión de PLANES. Un plan define qué módulos habilita para
 * los tenants que lo tienen. Solo invocable por operadores de plataforma.
 */

import { z } from 'zod';
import { adminDb } from '@/firebase/admin';
import { requirePlatformAdmin } from '@/firebase/claims';
import { logPlatformAudit } from '@/lib/platform-audit';
import { slugify } from '@/lib/slug';
import { APP_MODULES } from '@/lib/types';

const VALID_MODULES = APP_MODULES.map((m) => m.key) as string[];

const PlanInput = z.object({
  idToken: z.string().min(1),
  /** Presente al editar; ausente al crear (se deriva del nombre). */
  planId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  modules: z.array(z.string()),
  /** Límites del tenant. 0 = ilimitado. */
  maxUsers: z.number().int().min(0).optional(),
  maxRoles: z.number().int().min(0).optional(),
  maxCampaigns: z.number().int().min(0).optional(),
  status: z.enum(['activo', 'inactivo']).default('activo'),
});

export async function upsertPlan(
  raw: z.infer<typeof PlanInput>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = PlanInput.parse(raw);
    const caller = await requirePlatformAdmin(data.idToken);

    const modules = [...new Set(data.modules.filter((m) => VALID_MODULES.includes(m)))];
    const maxUsers = data.maxUsers ?? 0;
    const maxRoles = data.maxRoles ?? 0;
    const maxCampaigns = data.maxCampaigns ?? 0;
    const id = data.planId || slugify(data.name);
    if (!id) return { success: false, error: 'Nombre de plan inválido.' };

    await adminDb.collection('plans').doc(id).set(
      {
        name: data.name,
        description: data.description || '',
        modules,
        maxUsers,
        maxRoles,
        maxCampaigns,
        status: data.status,
      },
      { merge: true }
    );

    // `planModules` y los límites están DENORMALIZADOS en cada tenant, así que
    // editar el plan no basta: hay que reescribir la copia de los tenants que ya
    // lo tienen. El provider está suscrito en vivo al doc del tenant, por lo que
    // el cambio se refleja sin necesidad de re-login.
    const affected = await adminDb.collection('tenants').where('plan', '==', id).get();
    if (!affected.empty) {
      const batch = adminDb.batch();
      affected.docs.forEach((d) => batch.update(d.ref, { planModules: modules, maxUsers, maxRoles, maxCampaigns }));
      await batch.commit();
    }

    await logPlatformAudit(caller.uid, data.planId ? 'plan:update' : 'plan:create', { planId: id, name: data.name });
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo guardar el plan.' };
  }
}

export async function deletePlan(input: {
  idToken: string;
  planId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);
    await adminDb.collection('plans').doc(input.planId).delete();
    await logPlatformAudit(caller.uid, 'plan:delete', { planId: input.planId });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo eliminar el plan.' };
  }
}

/** Crea (idempotente) los 3 planes por defecto, ya con módulos GRANULARES.
 *  Son solo ejemplos editables: el operador arma cada plan a la carta para
 *  cobrar por módulo adicional. La base de administración (roles/usuarios/
 *  configuración) va en TODOS para que el admin del tenant pueda operar. */
export async function seedDefaultPlans(input: {
  idToken: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    const ADMIN_BASE = ['admin_roles', 'admin_users', 'admin_settings'];
    const defaults: Record<string, { name: string; modules: string[]; maxUsers: number; maxRoles: number; maxCampaigns: number }> = {
      basico: {
        name: 'Básico',
        modules: ['campaigns', 'voters', ...ADMIN_BASE],
        maxUsers: 5,
        maxRoles: 3,
        maxCampaigns: 1,
      },
      estratega: {
        name: 'Estratega',
        modules: [
          'campaigns', 'voters', 'voters_map', 'network',
          'activities_calendar', 'activities_calls', 'activities_tasks',
          'admin_cities', 'admin_forms', ...ADMIN_BASE,
        ],
        maxUsers: 20,
        maxRoles: 8,
        maxCampaigns: 5,
      },
      // El plan tope habilita TODO y sin límites (0 = ilimitado).
      '360': { name: '360', modules: [...VALID_MODULES], maxUsers: 0, maxRoles: 0, maxCampaigns: 0 },
    };
    const batch = adminDb.batch();
    for (const [id, p] of Object.entries(defaults)) {
      batch.set(
        adminDb.collection('plans').doc(id),
        { name: p.name, description: '', modules: p.modules, maxUsers: p.maxUsers, maxRoles: p.maxRoles, maxCampaigns: p.maxCampaigns, status: 'activo' },
        { merge: true }
      );
    }
    await batch.commit();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudieron crear los planes por defecto.' };
  }
}
