'use server';

/**
 * Control Plane — visor de auditoría UNIFICADO. Todos los logs (de cualquier
 * tenant y de la plataforma) viven en la base central `estratega-logs`,
 * etiquetados con `tenantId` (o `'platform'`). Este Server Action (Admin SDK)
 * la consulta con filtro opcional por tenant. Solo operadores con `audit:read`.
 */

import type { Query } from 'firebase-admin/firestore';
import { getLogsDb } from '@/firebase/admin';
import { requirePlatformPermission } from '@/firebase/claims';
import type { AuditLog } from '@/lib/types';

export type AuditLogRow = AuditLog & { id: string };

export async function listAuditLogs(input: {
  idToken: string;
  /** 'all' (todos), 'platform', o un tenantId. */
  scope: string;
  limit?: number;
}): Promise<{ logs?: AuditLogRow[]; error?: string }> {
  try {
    await requirePlatformPermission(input.idToken, 'audit:read');
    const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);

    const col = getLogsDb().collection('auditLogs');
    // 'all' → solo orden por fecha (índice de un campo, automático).
    // por tenant → where + orderBy (requiere índice compuesto tenantId,timestamp).
    const query: Query =
      input.scope && input.scope !== 'all'
        ? col.where('tenantId', '==', input.scope).orderBy('timestamp', 'desc')
        : col.orderBy('timestamp', 'desc');

    const snap = await query.limit(limit).get();
    const logs: AuditLogRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditLog) }));
    return { logs };
  } catch (e: any) {
    return { error: e?.message || 'No se pudieron cargar los logs.' };
  }
}
