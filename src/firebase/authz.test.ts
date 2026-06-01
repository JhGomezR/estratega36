// Mock the Admin SDK layer so authz can be tested in isolation (no real Firestore).
jest.mock('@/firebase/admin', () => {
  const makeDb = (store: Record<string, Record<string, any>>) => ({
    collection: (col: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists: !!store[col]?.[id],
          data: () => store[col]?.[id],
        }),
      }),
    }),
  });

  const adminStore = {
    tenants: { acme: { databaseId: 'tenant-acme' } },
    users: { u9: { roleId: 'lider' } },
    roles: { lider: { name: 'Lider', permissions: ['voter:read'] } },
  };
  const tenantStore = {
    roles: {
      admin: { name: 'Admin', permissions: [] as string[] },
      editor: { name: 'Editor', permissions: ['voter:read', 'user:create'] },
    },
  };

  return {
    adminApp: {},
    adminDb: makeDb(adminStore),
    getTenantDb: () => makeDb(tenantStore),
  };
});

jest.mock('@/firebase/claims', () => ({
  verifyCaller: jest.fn(),
}));

import { getCallerContext, can, assertCan } from '@/firebase/authz';
import { verifyCaller } from '@/firebase/claims';

const mockVerify = jest.mocked(verifyCaller);

beforeEach(() => mockVerify.mockReset());

describe('can / assertCan (pure)', () => {
  it('grants everything to platform admins', () => {
    const ctx = { isPlatformAdmin: true, permissions: new Set<string>() } as any;
    expect(can(ctx, 'voter:delete')).toBe(true);
  });

  it('grants on wildcard permission', () => {
    const ctx = { isPlatformAdmin: false, permissions: new Set(['*']) } as any;
    expect(can(ctx, 'anything:here')).toBe(true);
  });

  it('grants only the exact permission held', () => {
    const ctx = { isPlatformAdmin: false, permissions: new Set(['voter:read']) } as any;
    expect(can(ctx, 'voter:read')).toBe(true);
    expect(can(ctx, 'voter:delete')).toBe(false);
  });

  it('assertCan throws when the permission is missing', () => {
    const ctx = { isPlatformAdmin: false, permissions: new Set<string>() } as any;
    expect(() => assertCan(ctx, 'user:create')).toThrow();
  });
});

describe('getCallerContext (scope resolution)', () => {
  it('resolves a platform operator to full access', async () => {
    mockVerify.mockResolvedValue({ uid: 'p1', platformAdmin: true } as any);
    const ctx = await getCallerContext('token');
    expect(ctx.scope).toBe('platform');
    expect(ctx.isPlatformAdmin).toBe(true);
    expect(can(ctx, 'whatever:action')).toBe(true);
  });

  it('resolves a tenant member to their tenant-DB role permissions', async () => {
    mockVerify.mockResolvedValue({ uid: 'u1', tenantId: 'acme', roleId: 'editor' } as any);
    const ctx = await getCallerContext('token');
    expect(ctx.scope).toBe('tenant');
    expect(can(ctx, 'user:create')).toBe(true);
    expect(can(ctx, 'campaign:delete')).toBe(false);
  });

  it('treats an admin-named tenant role as wildcard', async () => {
    mockVerify.mockResolvedValue({ uid: 'u2', tenantId: 'acme', roleId: 'admin' } as any);
    const ctx = await getCallerContext('token');
    expect(can(ctx, 'campaign:delete')).toBe(true);
  });

  it('resolves a legacy user (no claims) against the default DB', async () => {
    mockVerify.mockResolvedValue({ uid: 'u9' } as any);
    const ctx = await getCallerContext('token');
    expect(ctx.scope).toBe('legacy');
    expect(can(ctx, 'voter:read')).toBe(true);
    expect(can(ctx, 'user:delete')).toBe(false);
  });

  it('rejects a tenant claim with no matching registry entry', async () => {
    mockVerify.mockResolvedValue({ uid: 'x', tenantId: 'ghost', roleId: 'editor' } as any);
    await expect(getCallerContext('token')).rejects.toThrow(/Tenant/);
  });
});
