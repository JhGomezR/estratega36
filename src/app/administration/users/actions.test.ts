/**
 * Integration test for createUser: verifies server-side authorization is
 * enforced (the Admin SDK bypasses Firestore rules, so this is the real gate)
 * and that the profile is written to the CALLER'S database scope.
 */

jest.mock('@/firebase/admin', () => ({
  adminAuth: { createUser: jest.fn(), deleteUser: jest.fn() },
}));

jest.mock('@/firebase/authz', () => ({
  getCallerContext: jest.fn(),
  assertCan: jest.fn(),
}));

jest.mock('@/firebase/claims', () => ({
  setTenantClaims: jest.fn(),
}));

jest.mock('@/firebase/plan-limits', () => ({
  assertWithinUserLimit: jest.fn(),
  assertWithinRoleLimit: jest.fn(),
}));

import { createUser } from '@/app/administration/users/actions';
import { getCallerContext, assertCan } from '@/firebase/authz';
import { setTenantClaims } from '@/firebase/claims';
import { adminAuth } from '@/firebase/admin';

const setMock = jest.fn();
const fakeDb = { collection: () => ({ doc: () => ({ set: setMock }) }) };

const DATA: any = {
  email: 'nuevo@acme.com',
  password: 'sup3rsecret',
  firstName: 'Nora',
  lastName: 'Nueva',
  idType: 'cedula_ciudadania',
  idNumber: '123',
  phone: '300',
  roleId: 'editor',
  cityIds: [],
  campaignIds: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (getCallerContext as jest.Mock).mockResolvedValue({
    uid: 'caller', isPlatformAdmin: false, scope: 'tenant', tenantId: 'acme', db: fakeDb,
    permissions: new Set(['user:create']),
  });
  (assertCan as jest.Mock).mockImplementation(() => {});
  setMock.mockResolvedValue(undefined);
  (adminAuth.createUser as jest.Mock).mockResolvedValue({ uid: 'new-uid' });
  (adminAuth.deleteUser as jest.Mock).mockResolvedValue(undefined);
  (setTenantClaims as jest.Mock).mockResolvedValue(undefined);
});

describe('createUser', () => {
  it('rejects callers lacking user:create and never creates an auth user', async () => {
    (assertCan as jest.Mock).mockImplementation(() => { throw new Error('No autorizado'); });
    const res = await createUser(DATA, 'tok');
    expect(res.error).toBeDefined();
    expect(adminAuth.createUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid/empty token', async () => {
    (getCallerContext as jest.Mock).mockRejectedValue(new Error('Sesión inválida'));
    const res = await createUser(DATA, '');
    expect(res.error).toBeDefined();
    expect(adminAuth.createUser).not.toHaveBeenCalled();
  });

  it('creates the user and writes the profile to the caller scope DB', async () => {
    const res = await createUser(DATA, 'tok');
    expect(res.uid).toBe('new-uid');
    expect(adminAuth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@acme.com' })
    );
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@acme.com', status: 'activo' })
    );
  });

  it('requires a password', async () => {
    const res = await createUser({ ...DATA, password: '' }, 'tok');
    expect(res.error).toMatch(/contraseña/i);
    expect(adminAuth.createUser).not.toHaveBeenCalled();
  });
});

describe('createUser — tenant custom claims', () => {
  it('assigns {tenantId, roleId} so the account resolves to the tenant DB', async () => {
    const res = await createUser(DATA, 'tok');
    expect(res.uid).toBe('new-uid');
    // tenantId comes from the verified caller context, roleId from the form.
    expect(setTenantClaims).toHaveBeenCalledWith('new-uid', 'acme', 'editor');
    // Claims must be set BEFORE the profile is written.
    expect((setTenantClaims as jest.Mock).mock.invocationCallOrder[0])
      .toBeLessThan(setMock.mock.invocationCallOrder[0]);
  });

  it('also assigns claims when a platform operator impersonates a tenant', async () => {
    (getCallerContext as jest.Mock).mockResolvedValue({
      uid: 'op', isPlatformAdmin: true, scope: 'platform', tenantId: 'acme', db: fakeDb,
      permissions: new Set(['*']),
    });
    await createUser(DATA, 'tok', 'acme');
    expect(getCallerContext).toHaveBeenCalledWith('tok', 'acme');
    expect(setTenantClaims).toHaveBeenCalledWith('new-uid', 'acme', 'editor');
  });

  it('does NOT assign tenant claims for a legacy (pre-migration) caller', async () => {
    (getCallerContext as jest.Mock).mockResolvedValue({
      uid: 'legacy', isPlatformAdmin: false, scope: 'legacy', db: fakeDb,
      permissions: new Set(['user:create']),
    });
    const res = await createUser(DATA, 'tok');
    expect(res.uid).toBe('new-uid');
    expect(setTenantClaims).not.toHaveBeenCalled();
    expect(setMock).toHaveBeenCalled();
  });

  it('rolls the creation back (deletes the auth user) if claims cannot be set', async () => {
    (setTenantClaims as jest.Mock).mockRejectedValue(new Error('IAM denied'));
    const res = await createUser(DATA, 'tok');
    expect(res.error).toMatch(/revertida/i);
    expect(res.uid).toBeUndefined();
    expect(adminAuth.deleteUser).toHaveBeenCalledWith('new-uid');
    // No orphan profile is left behind either.
    expect(setMock).not.toHaveBeenCalled();
  });
});
