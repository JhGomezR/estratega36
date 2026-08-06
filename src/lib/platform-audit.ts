/**
 * Auditoría de acciones de OPERADORES DE PLATAFORMA → base central `estratega-logs`
 * con `tenantId: 'platform'`.
 *
 * Módulo ligero (solo Admin SDK, sin `next/headers` ni geolocalización): se
 * llama desde Server Actions del Control Plane que ya verificaron al operador,
 * pasando su identidad ya validada (del token). Nunca lanza: auditar no debe
 * romper la acción.
 */

import { getLogsDb } from '@/firebase/admin';

export async function logPlatformAudit(
  actor: { uid: string; email?: string | null },
  action: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await getLogsDb().collection('auditLogs').add({
      userId: actor.uid,
      tenantId: 'platform',
      ...(actor.email ? { userEmail: actor.email } : {}),
      action,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  } catch (error) {
    console.error('Failed to write platform audit log:', action, error);
  }
}
