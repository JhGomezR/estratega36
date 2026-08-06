'use server';

/**
 * Control Plane — gestión de NOTIFICACIONES del sistema. Fuente única en
 * `(default)/notifications`: los tenants las leen (solo lectura), así que crear,
 * editar o borrar aquí se refleja en todos sin copias ni propagación. Solo
 * invocable por operadores de plataforma.
 */

import { z } from 'zod';
import { adminDb } from '@/firebase/admin';
import { requirePlatformAdmin } from '@/firebase/claims';
import { logPlatformAudit } from '@/lib/platform-audit';

// Tope defensivo del data URL base64. El límite de documento de Firestore es
// ~1 MB; dejamos margen para el resto de campos. El cliente además comprime.
const MAX_IMAGE_CHARS = 900_000;

const NotificationInput = z
  .object({
    idToken: z.string().min(1),
    /** Presente al editar; ausente al crear (id autogenerado). */
    id: z.string().optional(),
    title: z.string().min(2, 'El título es demasiado corto.').max(120),
    body: z.string().min(1, 'El mensaje no puede estar vacío.').max(5000),
    /** data URL base64 (opcional). Cadena vacía = sin imagen. */
    imageUrl: z.string().max(MAX_IMAGE_CHARS, 'La imagen es demasiado grande.').optional(),
    audience: z.enum(['all', 'tenant']),
    tenantId: z.string().optional(),
    status: z.enum(['activo', 'inactivo']).default('activo'),
  })
  .refine((d) => d.audience !== 'tenant' || (d.tenantId && d.tenantId.length > 0), {
    message: 'Debes elegir el tenant destinatario.',
    path: ['tenantId'],
  });

export async function upsertNotification(
  raw: z.infer<typeof NotificationInput>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const data = NotificationInput.parse(raw);
    const caller = await requirePlatformAdmin(data.idToken);

    const col = adminDb.collection('notifications');
    const ref = data.id ? col.doc(data.id) : col.doc();
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl || '',
      audience: data.audience,
      tenantId: data.audience === 'tenant' ? data.tenantId : '',
      status: data.status,
    };

    if (data.id) {
      payload.updatedAt = now;
      await ref.set(payload, { merge: true });
    } else {
      payload.createdAt = now;
      await ref.set(payload);
    }

    await logPlatformAudit(caller, data.id ? 'notification:update' : 'notification:create', { id: ref.id, audience: data.audience });
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo guardar la notificación.' };
  }
}

export async function deleteNotification(input: {
  idToken: string;
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);
    await adminDb.collection('notifications').doc(input.id).delete();
    await logPlatformAudit(caller, 'notification:delete', { id: input.id });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo eliminar la notificación.' };
  }
}
