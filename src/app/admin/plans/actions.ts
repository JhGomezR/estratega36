'use server';

/**
 * Control Plane — gestión de PLANES. Un plan define qué módulos habilita para
 * los tenants que lo tienen. Solo invocable por operadores de plataforma.
 */

import { z } from 'zod';
import { adminDb } from '@/firebase/admin';
import { requirePlatformAdmin } from '@/firebase/claims';
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
  status: z.enum(['activo', 'inactivo']).default('activo'),
});

export async function upsertPlan(
  raw: z.infer<typeof PlanInput>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = PlanInput.parse(raw);
    await requirePlatformAdmin(data.idToken);

    const modules = [...new Set(data.modules.filter((m) => VALID_MODULES.includes(m)))];
    const id = data.planId || slugify(data.name);
    if (!id) return { success: false, error: 'Nombre de plan inválido.' };

    await adminDb.collection('plans').doc(id).set(
      {
        name: data.name,
        description: data.description || '',
        modules,
        status: data.status,
      },
      { merge: true }
    );
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
    await requirePlatformAdmin(input.idToken);
    await adminDb.collection('plans').doc(input.planId).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo eliminar el plan.' };
  }
}

/** Crea (idempotente) los 3 planes por defecto. Administración va en TODOS
 *  (el admin del tenant debe poder gestionar sus usuarios/roles siempre). */
export async function seedDefaultPlans(input: {
  idToken: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    const defaults: Record<string, { name: string; modules: string[] }> = {
      basico: { name: 'Básico', modules: ['campaigns', 'voters', 'administration'] },
      estratega: {
        name: 'Estratega',
        modules: ['campaigns', 'voters', 'network', 'activities', 'administration'],
      },
      '360': {
        name: '360',
        modules: ['campaigns', 'voters', 'network', 'activities', 'analysis', 'administration'],
      },
    };
    const batch = adminDb.batch();
    for (const [id, p] of Object.entries(defaults)) {
      batch.set(
        adminDb.collection('plans').doc(id),
        { name: p.name, description: '', modules: p.modules, status: 'activo' },
        { merge: true }
      );
    }
    await batch.commit();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudieron crear los planes por defecto.' };
  }
}
