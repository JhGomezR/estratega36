/**
 * Auditoría de acciones de OPERADORES DE PLATAFORMA → `(default)/auditLogs`.
 *
 * Módulo ligero (solo Admin SDK, sin `next/headers` ni geolocalización): se
 * llama desde Server Actions del Control Plane que ya verificaron al operador,
 * pasando su uid ya validado. Nunca lanza: auditar no debe romper la acción.
 */

import { adminDb } from '@/firebase/admin';

export async function logPlatformAudit(
  uid: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await adminDb.collection('auditLogs').add({
      userId: uid,
      action,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  } catch (error) {
    console.error('Failed to write platform audit log:', action, error);
  }
}
