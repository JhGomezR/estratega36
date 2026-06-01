'use server';

/**
 * Control Plane — platform role management. Writes go through the Admin SDK so
 * they work regardless of which ruleset is currently deployed to `(default)`.
 */

import { z } from 'zod';
import { adminDb } from '@/firebase/admin';
import { requirePlatformAdmin } from '@/firebase/claims';
import { availablePlatformPermissions } from '@/lib/types';

const RoleInput = z.object({
  idToken: z.string().min(1),
  roleId: z.string().optional(),
  name: z.string().min(2),
  permissions: z.array(z.string()),
  status: z.enum(['activo', 'inactivo']).default('activo'),
});

export async function upsertPlatformRole(
  raw: z.infer<typeof RoleInput>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = RoleInput.parse(raw);
    await requirePlatformAdmin(data.idToken);

    // Only persist known permissions.
    const permissions = data.permissions.filter((p) => availablePlatformPermissions.includes(p));
    const payload = { name: data.name, permissions, status: data.status };

    const ref = data.roleId
      ? adminDb.collection('platformRoles').doc(data.roleId)
      : adminDb.collection('platformRoles').doc();
    await ref.set(payload, { merge: true });
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo guardar el rol.' };
  }
}

export async function deletePlatformRole(input: {
  idToken: string;
  roleId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    await adminDb.collection('platformRoles').doc(input.roleId).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo eliminar el rol.' };
  }
}
