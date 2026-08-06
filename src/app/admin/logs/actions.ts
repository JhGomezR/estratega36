'use server';

/**
 * Control Plane — visor de auditoría. Los logs viven en la base del actor:
 *   - acciones de operadores de plataforma → `(default)/auditLogs`
 *   - acciones de usuarios de un tenant     → base del tenant `/auditLogs`
 * Este Server Action (Admin SDK) lee la base correcta según el ámbito y hace un
 * join con los nombres de usuario. Solo para operadores con permiso `audit:read`.
 */

import { adminDb, getTenantDb } from '@/firebase/admin';
import { requirePlatformPermission } from '@/firebase/claims';
import type { AuditLog } from '@/lib/types';
import type { Firestore } from 'firebase-admin/firestore';

export type AuditLogRow = AuditLog & { id: string; userLabel?: string };

async function resolveScopeDb(scope: string): Promise<Firestore> {
  if (scope === 'platform') return adminDb;
  const snap = await adminDb.collection('tenants').doc(scope).get();
  const databaseId = (snap.data() as { databaseId?: string } | undefined)?.databaseId;
  if (!databaseId) throw new Error('Tenant no encontrado o sin base de datos.');
  return getTenantDb(databaseId);
}

export async function listAuditLogs(input: {
  idToken: string;
  /** 'platform' o un tenantId. */
  scope: string;
  limit?: number;
}): Promise<{ logs?: AuditLogRow[]; error?: string }> {
  try {
    await requirePlatformPermission(input.idToken, 'audit:read');
    const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
    const db = await resolveScopeDb(input.scope);

    const snap = await db.collection('auditLogs').orderBy('timestamp', 'desc').limit(limit).get();
    const rows: AuditLogRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditLog) }));

    // Join de etiquetas de usuario: plataforma → platformUsers; tenant → users.
    const userCol = input.scope === 'platform' ? 'platformUsers' : 'users';
    const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
    if (ids.length) {
      const userSnaps = await db.getAll(...ids.map((id) => db.collection(userCol).doc(id)));
      const labels: Record<string, string> = {};
      userSnaps.forEach((s) => {
        const u = s.data() as { firstName?: string; lastName?: string; email?: string } | undefined;
        if (u) {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
          labels[s.id] = [name, u.email].filter(Boolean).join(' · ');
        }
      });
      rows.forEach((r) => { r.userLabel = labels[r.userId]; });
    }

    return { logs: rows };
  } catch (e: any) {
    return { error: e?.message || 'No se pudieron cargar los logs.' };
  }
}
