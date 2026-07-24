/**
 * Tests de la normalización `audit_logs` (legacy) → `auditLogs` (canónica).
 *
 * Se prueba con documentos con la forma REAL que escribió el logger legacy
 * (`src/lib/audit-logger.ts` en el commit 2a1bcff): la consolidación toca datos
 * de auditoría de producción, así que lo crítico es que (a) el `action` quede
 * en el mismo vocabulario que emite hoy la app y (b) no se pierda ni un campo.
 */

import {
  LEGACY_AUDIT_SOURCE,
  normalizeLegacyAuditLog,
  normalizeTimestamp,
  toAction,
  toEntityName,
} from '@/lib/audit-log-normalize';

describe('toEntityName', () => {
  it('mapea las colecciones conocidas a su singular', () => {
    expect(toEntityName('voters')).toBe('voter');
    expect(toEntityName('users')).toBe('user');
    expect(toEntityName('socialMentions')).toBe('socialMention');
    expect(toEntityName('settings')).toBe('settings');
  });

  it('cae en una regla genérica para colecciones no previstas', () => {
    expect(toEntityName('categories')).toBe('category');
    expect(toEntityName('widgets')).toBe('widget');
    expect(toEntityName('agenda')).toBe('agenda');
  });
});

describe('toAction', () => {
  it('produce el mismo vocabulario que emite hoy la app', () => {
    // src/app/login/page.tsx emite 'user:login'; el legacy guardaba
    // {eventType:'login', collectionName:'users'}. Deben coincidir.
    expect(toAction('login', 'users')).toBe('user:login');
    expect(toAction('logout', 'users')).toBe('user:logout');
    expect(toAction('create', 'voters')).toBe('voter:create');
    expect(toAction('delete', 'campaigns')).toBe('campaign:delete');
  });

  it('marca como unknown lo que falte, en vez de inventarlo', () => {
    expect(toAction(undefined, 'voters')).toBe('voter:unknown');
    expect(toAction('create', undefined)).toBe('unknown:create');
    expect(toAction(undefined, undefined)).toBe('unknown:unknown');
  });
});

describe('normalizeTimestamp', () => {
  it('conserva las cadenas ISO tal cual', () => {
    expect(normalizeTimestamp('2026-01-19T23:43:20.000Z')).toBe('2026-01-19T23:43:20.000Z');
  });

  it('acepta Date, epoch ms y Timestamp del Admin SDK', () => {
    expect(normalizeTimestamp(new Date('2026-01-19T00:00:00.000Z'))).toBe('2026-01-19T00:00:00.000Z');
    expect(normalizeTimestamp(Date.parse('2026-01-19T00:00:00.000Z'))).toBe('2026-01-19T00:00:00.000Z');
    expect(normalizeTimestamp({ toDate: () => new Date('2026-01-19T00:00:00.000Z') }))
      .toBe('2026-01-19T00:00:00.000Z');
    expect(normalizeTimestamp({ _seconds: 1768780800, _nanoseconds: 0 }))
      .toBe(new Date(1768780800 * 1000).toISOString());
  });

  it('devuelve null cuando no hay nada aprovechable', () => {
    expect(normalizeTimestamp(undefined)).toBeNull();
    expect(normalizeTimestamp(null)).toBeNull();
    expect(normalizeTimestamp('')).toBeNull();
    expect(normalizeTimestamp({})).toBeNull();
  });
});

describe('normalizeLegacyAuditLog', () => {
  const legacyDelete = {
    userId: 'uid-1',
    userEmail: 'ana@example.com',
    timestamp: '2026-01-19T23:43:20.000Z',
    eventType: 'delete',
    collectionName: 'voters',
    documentId: 'voter-9',
    details: { voterName: 'Ana Pérez' },
  };

  it('traduce el documento legacy al esquema canónico', () => {
    const { entry, warnings } = normalizeLegacyAuditLog(legacyDelete);

    expect(entry.userId).toBe('uid-1');
    expect(entry.action).toBe('voter:delete');
    expect(entry.timestamp).toBe('2026-01-19T23:43:20.000Z');
    expect(entry.details).toEqual({ voterName: 'Ana Pérez' });
    expect(entry.userEmail).toBe('ana@example.com');
    expect(warnings).toEqual([]);
  });

  it('marca la procedencia para que la copia sea verificable e idempotente', () => {
    const { entry } = normalizeLegacyAuditLog(legacyDelete);
    expect(entry.source).toBe(LEGACY_AUDIT_SOURCE);
  });

  it('conserva los campos legacy sin equivalente canónico', () => {
    const { entry } = normalizeLegacyAuditLog(legacyDelete);
    expect(entry.legacy).toEqual({
      eventType: 'delete',
      collectionName: 'voters',
      documentId: 'voter-9',
    });
  });

  it('conserva también las claves legacy desconocidas (cero pérdida)', () => {
    const { entry } = normalizeLegacyAuditLog({ ...legacyDelete, sessionId: 'abc', retries: 2 });
    expect(entry.legacy?.extra).toEqual({ sessionId: 'abc', retries: 2 });
  });

  it('promueve details.userAgent del evento de login sin borrarlo de details', () => {
    const { entry } = normalizeLegacyAuditLog({
      userId: 'uid-1',
      userEmail: 'ana@example.com',
      timestamp: '2026-01-19T23:43:20.000Z',
      eventType: 'login',
      collectionName: 'users',
      details: { userAgent: 'Mozilla/5.0' },
    });

    expect(entry.action).toBe('user:login');
    expect(entry.userAgent).toBe('Mozilla/5.0');
    expect(entry.details).toEqual({ userAgent: 'Mozilla/5.0' });
  });

  it('nunca emite `undefined` (Firestore lo rechaza)', () => {
    const { entry } = normalizeLegacyAuditLog({ userId: 'uid-1', timestamp: '2026-01-01T00:00:00.000Z' });
    for (const [key, value] of Object.entries(entry)) {
      expect(`${key}=${value}`).not.toContain('undefined');
      expect(value).toBeDefined();
    }
    expect('details' in entry).toBe(false);
    expect('userEmail' in entry).toBe(false);
  });

  it('reporta las anomalías en vez de descartar el documento', () => {
    const { entry, warnings } = normalizeLegacyAuditLog({
      eventType: 'purge',
      collectionName: 'gizmos',
    });

    expect(warnings).toEqual(
      expect.arrayContaining([
        'missing-userId',
        'missing-timestamp',
        'unknown-eventType',
        'unmapped-collectionName',
      ])
    );
    // El documento sigue siendo migrable: la auditoría no se tira a la basura.
    expect(entry.action).toBe('gizmo:purge');
    expect(entry.userId).toBe('');
    expect(entry.timestamp).toBe('');
  });

  it('es determinista: normalizar dos veces da el mismo resultado (idempotencia)', () => {
    const a = normalizeLegacyAuditLog(legacyDelete).entry;
    const b = normalizeLegacyAuditLog(legacyDelete).entry;
    expect(a).toEqual(b);
  });
});
