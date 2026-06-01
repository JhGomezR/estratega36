/**
 * Integration test for createUser: verifies server-side authorization is
 * enforced (the Admin SDK bypasses Firestore rules, so this is the real gate)
 * and that the profile is written to the CALLER'S database scope.
 */

jest.mock('@/firebase/admin', () => ({
  adminAuth: { createUser: jest.fn() },
}));

jest.mock('@/firebase/authz', () => ({
  getCallerContext: jest.fn(),
  assertCan: jest.fn(),
}));

import { createUser } from '@/app/administration/users/actions';
import { getCallerContext, assertCan } from '@/firebase/authz';
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
    uid: 'caller', isPlatformAdmin: false, scope: 'tenant', db: fakeDb,
    permissions: new Set(['user:create']),
  });
  (assertCan as jest.Mock).mockImplementation(() => {});
  setMock.mockResolvedValue(undefined);
  (adminAuth.createUser as jest.Mock).mockResolvedValue({ uid: 'new-uid' });
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
