/**
 * Tests for logAudit: it is a Server Action reachable by anyone and it writes
 * with the Admin SDK (rules bypassed), so the identity MUST come from the
 * verified ID token — never from anything the client can choose — and the entry
 * must land in the caller's database, not always in the control plane.
 */

jest.mock('@/firebase/authz', () => ({
  getCallerContext: jest.fn(),
}));

jest.mock('next/headers', () => ({
  headers: () => new Map<string, string>([
    ['user-agent', 'jest-agent'],
    ['x-forwarded-for', '127.0.0.1'],
  ]),
}));

jest.mock('@/firebase/admin', () => ({
  getLogsDb: jest.fn(),
}));

import { logAudit } from '@/lib/audit-log';
import { getCallerContext } from '@/firebase/authz';
import { getLogsDb } from '@/firebase/admin';

const addMock = jest.fn();
const collectionMock = jest.fn(() => ({ add: addMock }));
const logsDb = { collection: collectionMock };

beforeEach(() => {
  jest.clearAllMocks();
  addMock.mockResolvedValue({ id: 'log1' });
  (getLogsDb as jest.Mock).mockReturnValue(logsDb);
  (getCallerContext as jest.Mock).mockResolvedValue({
    uid: 'uid-del-token', email: 'user@acme.com', scope: 'tenant', tenantId: 'acme',
    isPlatformAdmin: false, db: { collection: jest.fn() }, permissions: new Set<string>(),
  });
});

describe('logAudit', () => {
  it('records the uid from the verified token, not one supplied by the client', async () => {
    // The first argument is an ID TOKEN now; a client attempting to pass a uid
    // (or another user's uid) cannot influence what gets written.
    await logAudit('id-token', 'voter:create', { voterId: 'v1', userId: 'uid-falsificado' });

    expect(getCallerContext).toHaveBeenCalledWith('id-token', undefined);
    expect(addMock).toHaveBeenCalledTimes(1);
    const entry = addMock.mock.calls[0][0];
    expect(entry.userId).toBe('uid-del-token');
    expect(entry.userId).not.toBe('uid-falsificado');
    expect(entry.action).toBe('voter:create');
    expect(entry.userAgent).toBe('jest-agent');
  });

  it('writes to the CENTRAL logs database, tagged with the caller tenant', async () => {
    await logAudit('id-token', 'user:login');
    expect(getLogsDb).toHaveBeenCalled();
    expect(collectionMock).toHaveBeenCalledWith('auditLogs');
    const entry = addMock.mock.calls[0][0];
    expect(entry.tenantId).toBe('acme');
    expect(entry.userEmail).toBe('user@acme.com');
  });

  it('forwards the impersonated tenant so platform-operator actions are logged in that tenant', async () => {
    await logAudit('id-token', 'voter:delete', undefined, 'acme');
    expect(getCallerContext).toHaveBeenCalledWith('id-token', 'acme');
  });

  it('omits `details` entirely when there are none (Firestore rejects undefined)', async () => {
    await logAudit('id-token', 'user:login');
    const entry = addMock.mock.calls[0][0];
    expect('details' in entry).toBe(false);
  });

  it('never throws when the session is invalid — auditing must not block the action', async () => {
    (getCallerContext as jest.Mock).mockRejectedValue(new Error('Sesión inválida'));
    await expect(logAudit('bad-token', 'voter:create')).resolves.toBeUndefined();
    expect(addMock).not.toHaveBeenCalled();
  });

  it('never throws when the write fails', async () => {
    addMock.mockRejectedValue(new Error('PERMISSION_DENIED'));
    await expect(logAudit('id-token', 'voter:create')).resolves.toBeUndefined();
  });
});
