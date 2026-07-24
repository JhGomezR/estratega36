'use client';

/**
 * @fileoverview Puente de cliente hacia el Server Action `logAudit`.
 *
 * El servidor ya NO acepta un `userId` del cliente (era falsificable): exige el
 * ID token y toma de él la identidad. Este helper hace ese trabajo repetitivo:
 * obtiene el token del usuario y adjunta el tenant impersonado si el operador
 * de plataforma está "dentro" de un tenant, para que el registro caiga en la
 * base correcta.
 *
 * Nunca lanza: auditar no debe romper la acción principal del usuario. Devuelve
 * una promesa, así que puede llamarse con o sin `await`.
 */

import type { User } from 'firebase/auth';
import { logAudit } from '@/lib/audit-log';
import { getImpersonatedTenantId } from '@/firebase/tenant-db';

export async function logAuditEvent(
  user: User | null | undefined,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  if (!user) return;
  try {
    const idToken = await user.getIdToken();
    await logAudit(idToken, action, details, getImpersonatedTenantId());
  } catch (error) {
    console.warn('No se pudo registrar el evento de auditoría:', action, error);
  }
}
