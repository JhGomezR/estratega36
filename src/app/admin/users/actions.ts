'use server';

/**
 * Control Plane — platform user management. All actions require the caller to
 * be a platform operator. Platform users receive the `platformAdmin` custom
 * claim (granular platform permissions live in their platform role and are
 * enforced in the UI).
 */

import { z } from 'zod';
import { adminAuth, adminDb } from '@/firebase/admin';
import { requirePlatformAdmin, setPlatformAdminClaim } from '@/firebase/claims';
import { logPlatformAudit } from '@/lib/platform-audit';

const CreateInput = z.object({
  idToken: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().min(1),
});

export async function createPlatformUser(
  raw: z.infer<typeof CreateInput>
): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const data = CreateInput.parse(raw);
    const caller = await requirePlatformAdmin(data.idToken);

    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: `${data.firstName} ${data.lastName}`,
      emailVerified: false,
      disabled: false,
    });

    await setPlatformAdminClaim(userRecord.uid);

    await adminDb.collection('platformUsers').doc(userRecord.uid).set({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      roleId: data.roleId,
      avatar: `https://picsum.photos/seed/${userRecord.uid}/100/100`,
      status: 'activo',
    });

    await logPlatformAudit(caller.uid, 'platformUser:create', { uid: userRecord.uid, email: data.email });
    return { success: true, uid: userRecord.uid };
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') {
      return { success: false, error: 'El correo ya está en uso.' };
    }
    return { success: false, error: e?.message || 'No se pudo crear el usuario de plataforma.' };
  }
}

export async function setPlatformUserStatus(input: {
  idToken: string;
  uid: string;
  status: 'activo' | 'inactivo';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);
    await adminAuth.updateUser(input.uid, { disabled: input.status === 'inactivo' });
    await adminDb.collection('platformUsers').doc(input.uid).set({ status: input.status }, { merge: true });
    await logPlatformAudit(caller.uid, 'platformUser:set_status', { uid: input.uid, status: input.status });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo actualizar el usuario.' };
  }
}
