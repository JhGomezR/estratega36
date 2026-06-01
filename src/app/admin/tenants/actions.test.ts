/**
 * Integration tests for the tenant provisioning server action.
 * External boundaries (Admin SDK, Auth, GCP Firestore Admin / Rules APIs) are
 * mocked; the test exercises the real orchestration: authorize → register
 * 'provisioning' → create DB → deploy rules → create admin user → seed →
 * set claims → mark 'active' (and 'failed' on error).
 */

jest.mock('@/firebase/claims', () => ({
  requirePlatformAdmin: jest.fn(),
  setTenantClaims: jest.fn(),
  clearTenantClaims: jest.fn(),
}));

jest.mock('@/firebase/gcp-firestore-admin', () => ({
  createFirestoreDatabase: jest.fn(),
  waitForOperation: jest.fn(),
  deployFirestoreRules: jest.fn(),
}));

jest.mock('@/firebase/admin', () => {
  const tenantRef = { get: jest.fn(), set: jest.fn(), update: jest.fn() };
  const batch = { set: jest.fn(), commit: jest.fn() };
  const tenantDb = { batch: () => batch, collection: () => ({ doc: () => ({}) }) };
  return {
    adminApp: {},
    adminAuth: { createUser: jest.fn() },
    adminDb: { collection: () => ({ doc: () => tenantRef }) },
    getTenantDb: jest.fn(() => tenantDb),
    __mocks: { tenantRef, batch, tenantDb },
  };
});

import { provisionTenant } from '@/app/admin/tenants/actions';
import { requirePlatformAdmin, setTenantClaims } from '@/firebase/claims';
import { createFirestoreDatabase, waitForOperation, deployFirestoreRules } from '@/firebase/gcp-firestore-admin';

const admin = jest.requireMock('@/firebase/admin') as any;
const { tenantRef, batch } = admin.__mocks;

const VALID = {
  idToken: 'tok',
  displayName: 'Acme Corp',
  companyName: 'Acme Inc',
  plan: 'estratega' as const,
  locationId: 'nam5',
  adminEmail: 'admin@acme.com',
  adminPassword: 'sup3rsecret',
  adminFullName: 'Ada Admin',
};

beforeEach(() => {
  jest.clearAllMocks();
  (requirePlatformAdmin as jest.Mock).mockResolvedValue({ uid: 'op1', platformAdmin: true });
  tenantRef.get.mockResolvedValue({ exists: false });
  tenantRef.set.mockResolvedValue(undefined);
  tenantRef.update.mockResolvedValue(undefined);
  batch.commit.mockResolvedValue(undefined);
  admin.adminAuth.createUser.mockResolvedValue({ uid: 'admin-uid' });
  (createFirestoreDatabase as jest.Mock).mockResolvedValue('projects/p/operations/op1');
  (waitForOperation as jest.Mock).mockResolvedValue(undefined);
  (deployFirestoreRules as jest.Mock).mockResolvedValue(undefined);
});

describe('provisionTenant', () => {
  it('rejects a non-platform caller and never creates a database', async () => {
    (requirePlatformAdmin as jest.Mock).mockRejectedValue(new Error('No autorizado'));
    const res = await provisionTenant(VALID);
    expect(res.success).toBe(false);
    expect(createFirestoreDatabase).not.toHaveBeenCalled();
  });

  it('rejects invalid input (weak password) before doing any work', async () => {
    const res = await provisionTenant({ ...VALID, adminPassword: '123' });
    expect(res.success).toBe(false);
    expect(createFirestoreDatabase).not.toHaveBeenCalled();
  });

  it('fails fast if the tenant already exists', async () => {
    tenantRef.get.mockResolvedValue({ exists: true });
    const res = await provisionTenant(VALID);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Ya existe/);
    expect(createFirestoreDatabase).not.toHaveBeenCalled();
  });

  it('provisions end-to-end and marks the tenant active', async () => {
    const res = await provisionTenant(VALID);

    expect(res.success).toBe(true);
    expect(res.tenantId).toBe('acme-corp');

    // Dedicated database created with the derived id.
    expect(createFirestoreDatabase).toHaveBeenCalledWith('tenant-acme-corp', 'nam5');
    expect(waitForOperation).toHaveBeenCalled();

    // Rules deployed and bound to THIS tenant id (placeholder substituted).
    const [dbArg, rulesArg] = (deployFirestoreRules as jest.Mock).mock.calls[0];
    expect(dbArg).toBe('tenant-acme-corp');
    expect(rulesArg).toContain('acme-corp');
    expect(rulesArg).not.toContain('__TENANT_ID__');

    // Admin user created and bound to the tenant via claims.
    expect(admin.adminAuth.createUser).toHaveBeenCalled();
    expect(setTenantClaims).toHaveBeenCalledWith('admin-uid', 'acme-corp', 'admin');

    // Seed written and tenant marked active.
    expect(batch.commit).toHaveBeenCalled();
    expect(tenantRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', ownerUid: 'admin-uid' }));
  });

  it('marks the tenant failed if database creation throws', async () => {
    (createFirestoreDatabase as jest.Mock).mockRejectedValue(new Error('quota exceeded'));
    const res = await provisionTenant(VALID);
    expect(res.success).toBe(false);
    expect(tenantRef.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    // No admin user should have been created on this failure path.
    expect(admin.adminAuth.createUser).not.toHaveBeenCalled();
  });
});
