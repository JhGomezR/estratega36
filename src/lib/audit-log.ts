
'use server'

import { getCallerContext } from '@/firebase/authz';
import { getLogsDb } from '@/firebase/admin';
import type { AuditLog } from '@/lib/types';
import { headers } from 'next/headers';

/**
 * Colección CANÓNICA de auditoría. Es la que protegen `firestore.tenant.rules`
 * y `firestore.control-plane.rules`, y la que tiene índices en
 * `firestore.indexes.json`.
 *
 * ⚠️ CONSOLIDACIÓN PENDIENTE DE EJECUTAR (el código ya está listo): el
 * histórico real de producción (~1917 docs) sigue en la colección legacy
 * `audit_logs`, con otro esquema. Se copia a `auditLogs` con
 * `scripts/consolidate-audit-logs.ts` (dry-run primero), que normaliza el
 * esquema vía `src/lib/audit-log-normalize.ts` y marca cada entrada con
 * `source: 'legacy:audit_logs'`. Hasta que esa consolidación se ejecute contra
 * producción, cualquier consulta de histórico sobre `auditLogs` devolverá solo
 * lo escrito desde aquí. Ver docs/multi-tenant-runbook.md.
 */
const AUDIT_COLLECTION = 'auditLogs';

/** Presupuesto máximo para la geolocalización: nunca debe bloquear la acción. */
const GEO_TIMEOUT_MS = 1500;

/**
 * Resolves coarse geolocation for an IP, bounded by a short timeout so a slow
 * third party (ipapi.co) never sits in the critical path of a user action.
 * Returns `{}` on any failure.
 */
async function resolveGeo(ip: string): Promise<AuditLog['geo']> {
  if (!ip || ip === '127.0.0.1') return {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal });
    if (!res.ok) return {};
    const data = (await res.json()) as any;
    return {
      city: data.city,
      country: data.country_name,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (geoError) {
    console.warn('Could not fetch geolocation data for audit log:', geoError);
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Logs an audit event to Firestore.
 *
 * SECURITY: this is a Server Action reachable by anyone, and it writes with the
 * Admin SDK (which bypasses Firestore rules). Therefore it takes the caller's
 * **ID token**, not a uid: the identity written to the log is the verified one
 * from the token, so a client cannot forge entries on behalf of another user.
 * The entry is written to the CALLER'S database (tenant DB when applicable), so
 * tenant logs stay inside the tenant instead of piling up in the control plane.
 *
 * @param idToken - The caller's Firebase ID token (`auth.currentUser.getIdToken()`).
 * @param action - A string identifying the action (e.g. 'user:login', 'voter:create').
 * @param details - Optional details about the event (e.g. `{ voterId: '...' }`).
 * @param impersonatedTenantId - Tenant being impersonated by a platform operator, if any.
 */
export async function logAudit(
  idToken: string,
  action: string,
  details?: Record<string, any>,
  impersonatedTenantId?: string | null
) {
  try {
    const ctx = await getCallerContext(idToken, impersonatedTenantId);

    const headersList = headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    // This will get the proxy-forwarded IP in production, or the direct IP in local dev.
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

    const logEntry: AuditLog = {
      // NEVER a client-supplied id: the uid comes from the verified token.
      userId: ctx.uid,
      // Etiqueta de tenant (o 'platform') para el visor central unificado.
      tenantId: ctx.tenantId ?? 'platform',
      ...(ctx.email ? { userEmail: ctx.email } : {}),
      action,
      timestamp: new Date().toISOString(),
      // Firestore rechaza valores `undefined`: solo se incluye si hay detalles.
      ...(details ? { details } : {}),
      ipAddress: ip,
      userAgent,
      geo: await resolveGeo(ip),
    };

    // Escritura CENTRALIZADA: todos los logs (de cualquier tenant y de la
    // plataforma) van a la base dedicada `estratega-logs`, no a la base del
    // tenant. Aísla la carga y hace que el rastro sobreviva al borrado del tenant.
    await getLogsDb().collection(AUDIT_COLLECTION).add(logEntry);
  } catch (error) {
    console.error('Failed to write to audit log:', error);
    // We don't re-throw the error because failing to log an audit event
    // (including an invalid session) should not block the user's primary action.
  }
}
