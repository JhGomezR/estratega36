/**
 * Tests de createRole: verifica la autorización server-side (el Admin SDK evita
 * las reglas de Firestore), el cumplimiento del límite de roles del plan y la
 * escritura en la base del llamante.
 */

jest.mock('@/firebase/authz', () => ({
  getCallerContext: jest.fn(),
  assertCan: jest.fn(),
}));

jest.mock('@/firebase/plan-limits', () => ({
  assertWithinRoleLimit: jest.fn(),
}));

import { createRole } from '@/app/administration/roles/actions';
import { getCallerContext, assertCan } from '@/firebase/authz';
import { assertWithinRoleLimit } from '@/firebase/plan-limits';

const setMock = jest.fn();
const getMock = jest.fn();
const fakeDb = { collection: () => ({ doc: () => ({ get: getMock, set: setMock }) }) };

const DATA = { name: 'Coordinador', permissions: ['voter:read'], status: 'activo' as const };

beforeEach(() => {
  jest.clearAllMocks();
  (getCallerContext as jest.Mock).mockResolvedValue({
    uid: 'caller', isPlatformAdmin: false, scope: 'tenant', tenantId: 'acme', db: fakeDb,
    permissions: new Set(['role:create']),
  });
  (assertCan as jest.Mock).mockImplementation(() => {});
  (assertWithinRoleLimit as jest.Mock).mockResolvedValue(undefined);
  getMock.mockResolvedValue({ exists: false });
  setMock.mockResolvedValue(undefined);
});

describe('createRole', () => {
  it('rejects callers lacking role:create and never writes', async () => {
    (assertCan as jest.Mock).mockImplementation(() => { throw new Error('No autorizado'); });
    const res = await createRole(DATA, 'tok');
    expect(res.error).toBeDefined();
    expect(setMock).not.toHaveBeenCalled();
  });

  it('rejects when the plan role limit is exceeded', async () => {
    (assertWithinRoleLimit as jest.Mock).mockRejectedValue(new Error('Has alcanzado el límite de roles de tu plan (3).'));
    const res = await createRole(DATA, 'tok');
    expect(res.error).toMatch(/límite de roles/i);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('creates the role writing to the caller scope DB', async () => {
    const res = await createRole(DATA, 'tok');
    expect(res.id).toBe('coordinador');
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Coordinador', permissions: ['voter:read'], status: 'activo', trash: false })
    );
  });

  it('rejects a duplicate role id', async () => {
    getMock.mockResolvedValue({ exists: true });
    const res = await createRole(DATA, 'tok');
    expect(res.error).toMatch(/ya existe/i);
    expect(setMock).not.toHaveBeenCalled();
  });

  it('requires at least one permission', async () => {
    const res = await createRole({ ...DATA, permissions: [] }, 'tok');
    expect(res.error).toMatch(/permiso/i);
    expect(setMock).not.toHaveBeenCalled();
  });
});
