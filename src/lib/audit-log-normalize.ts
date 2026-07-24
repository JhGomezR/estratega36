/**
 * @fileoverview Normalización del esquema LEGACY de auditoría (`audit_logs`)
 * al esquema canónico (`auditLogs`).
 *
 * Contexto: durante un tiempo la app escribió desde el cliente en `audit_logs`
 * (snake_case) con un esquema distinto —ver `src/lib/audit-logger.ts` en el
 * commit 2a1bcff— y después pasó a escribir en `auditLogs` (camelCase) con el
 * esquema de `AuditLog`. La colección canónica es **`auditLogs`**: es la única
 * que cubren `firestore.tenant.rules` / `firestore.control-plane.rules` y la
 * que tiene índices en `firestore.indexes.json`.
 *
 * Este módulo es PURO (sin Firestore ni I/O) para poder testearlo: lo consume
 * `scripts/consolidate-audit-logs.ts`.
 *
 * Principio rector: **cero pérdida de información**. Todo campo legacy sin
 * equivalente canónico sobrevive bajo `legacy`, incluidos los desconocidos.
 */

import type { AuditLog } from '@/lib/types';

/** Colección canónica (la que protegen las reglas y escribe la app). */
export const AUDIT_COLLECTION = 'auditLogs';

/** Colección legacy con el histórico real de producción. */
export const LEGACY_AUDIT_COLLECTION = 'audit_logs';

/** Marca de procedencia; permite verificar y re-ejecutar la consolidación. */
export const LEGACY_AUDIT_SOURCE = 'legacy:audit_logs';

/** Forma (best-effort) de un documento de `audit_logs`. Todo es opcional: son
 *  datos de producción de hace tiempo y no hay garantía de que estén completos. */
export type LegacyAuditLog = {
  userId?: unknown;
  userEmail?: unknown;
  timestamp?: unknown;
  eventType?: unknown;
  collectionName?: unknown;
  documentId?: unknown;
  details?: unknown;
  [key: string]: unknown;
};

/** Claves legacy con tratamiento explícito; el resto va a `legacy.extra`. */
const KNOWN_LEGACY_KEYS = new Set([
  'userId', 'userEmail', 'timestamp', 'eventType', 'collectionName', 'documentId', 'details',
]);

/**
 * Singular de cada colección legacy, para construir el `action` canónico
 * (`voter:create`, `user:login`, …) con el mismo vocabulario que emite hoy
 * `logAuditEvent`. Ver los llamadores en `src/app/**`.
 */
const ENTITY_BY_COLLECTION: Record<string, string> = {
  users: 'user',
  voters: 'voter',
  campaigns: 'campaign',
  tasks: 'task',
  calls: 'call',
  forms: 'form',
  roles: 'role',
  lists: 'list',
  strategies: 'strategy',
  routes: 'route',
  keywords: 'keyword',
  socialMentions: 'socialMention',
  countries: 'geo',
  departments: 'geo',
  cities: 'geo',
  settings: 'settings',
};

/** `eventType` que escribía el logger legacy. Cualquier otro se marca. */
const KNOWN_EVENT_TYPES = new Set(['login', 'logout', 'create', 'update', 'delete', 'view']);

/** Motivos por los que un documento legacy no encaja limpiamente. */
export type NormalizeWarning =
  | 'missing-userId'
  | 'missing-timestamp'
  | 'unknown-eventType'
  | 'unmapped-collectionName';

export type NormalizeResult = {
  /** Entrada lista para escribir en `auditLogs` (sin `undefined`). */
  entry: AuditLog;
  /** Anomalías detectadas; el dry-run las agrega para revisión previa. */
  warnings: NormalizeWarning[];
};

/**
 * Deriva el nombre de entidad singular a partir del nombre de colección.
 * Usa el mapa explícito y, si no está, una regla genérica (`-ies` → `-y`,
 * `-s` → ``) para no perder información ante colecciones no previstas.
 */
export function toEntityName(collectionName: string): string {
  const known = ENTITY_BY_COLLECTION[collectionName];
  if (known) return known;
  if (collectionName.endsWith('ies')) return `${collectionName.slice(0, -3)}y`;
  if (collectionName.endsWith('s')) return collectionName.slice(0, -1);
  return collectionName;
}

/**
 * Convierte cualquier representación de fecha que pueda haber quedado en
 * producción (ISO string, `Date`, epoch ms, `Timestamp` del Admin SDK o su
 * forma serializada `{_seconds,_nanoseconds}`) a ISO 8601.
 * Devuelve `null` si no hay nada aprovechable.
 */
export function normalizeTimestamp(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(raw).toISOString();

  const obj = raw as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof obj.toDate === 'function') {
    const d = obj.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  }
  const seconds = typeof obj.seconds === 'number' ? obj.seconds
    : typeof obj._seconds === 'number' ? obj._seconds
    : null;
  if (seconds !== null) return new Date(seconds * 1000).toISOString();

  return null;
}

/**
 * Traduce `{eventType, collectionName}` al `action` canónico `entidad:verbo`.
 * `users` + `login` → `user:login`, que es exactamente lo que emite hoy
 * `src/app/login/page.tsx`, de modo que el histórico y lo nuevo se consultan
 * con el mismo filtro.
 */
export function toAction(eventType: unknown, collectionName: unknown): string {
  const verb = typeof eventType === 'string' && eventType ? eventType : 'unknown';
  const entity = typeof collectionName === 'string' && collectionName
    ? toEntityName(collectionName)
    : 'unknown';
  return `${entity}:${verb}`;
}

/** Copia un objeto quitando las claves con valor `undefined` (Firestore las rechaza). */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as any)[k] = v;
  }
  return out;
}

/**
 * Normaliza un documento de `audit_logs` al esquema `AuditLog` de `auditLogs`.
 *
 * Decisiones (documentadas porque afectan a datos de auditoría):
 *  - `eventType` + `collectionName` → `action`; ambos se conservan en `legacy`.
 *  - `userEmail` se promueve a campo de primer nivel (es identidad del actor).
 *  - `details.userAgent` (lo escribía el logger legacy en el evento de login)
 *    se promueve a `userAgent` sin borrarlo de `details`.
 *  - `documentId` y cualquier clave legacy desconocida sobreviven en `legacy`.
 *  - `source` marca la procedencia: hace la copia verificable e idempotente.
 */
export function normalizeLegacyAuditLog(raw: LegacyAuditLog): NormalizeResult {
  const warnings: NormalizeWarning[] = [];

  const userId = typeof raw.userId === 'string' && raw.userId ? raw.userId : '';
  if (!userId) warnings.push('missing-userId');

  const timestamp = normalizeTimestamp(raw.timestamp);
  if (timestamp === null) warnings.push('missing-timestamp');

  if (typeof raw.eventType !== 'string' || !KNOWN_EVENT_TYPES.has(raw.eventType)) {
    warnings.push('unknown-eventType');
  }
  if (typeof raw.collectionName !== 'string' || !ENTITY_BY_COLLECTION[raw.collectionName]) {
    warnings.push('unmapped-collectionName');
  }

  const details = raw.details && typeof raw.details === 'object' && !Array.isArray(raw.details)
    ? (raw.details as Record<string, any>)
    : undefined;

  const userAgent = typeof details?.userAgent === 'string' ? details.userAgent : undefined;

  const extra: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!KNOWN_LEGACY_KEYS.has(k) && v !== undefined) extra[k] = v;
  }

  const legacy = stripUndefined({
    eventType: typeof raw.eventType === 'string' ? raw.eventType : undefined,
    collectionName: typeof raw.collectionName === 'string' ? raw.collectionName : undefined,
    documentId: typeof raw.documentId === 'string' ? raw.documentId : undefined,
    ...(Object.keys(extra).length > 0 ? { extra } : {}),
  });

  const entry = stripUndefined({
    userId,
    action: toAction(raw.eventType, raw.collectionName),
    // Sin fecha aprovechable se escribe cadena vacía: queda evidente en las
    // consultas ordenadas por fecha en lugar de inventar un instante falso.
    timestamp: timestamp ?? '',
    ...(details ? { details } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(typeof raw.userEmail === 'string' && raw.userEmail ? { userEmail: raw.userEmail } : {}),
    source: LEGACY_AUDIT_SOURCE,
    ...(Object.keys(legacy).length > 0 ? { legacy } : {}),
  }) as AuditLog;

  return { entry, warnings };
}
