/**
 * Security-rules tests against the Firestore emulator.
 * Plain ESM JS (no TS transpilation) so it runs under environments that block
 * native binaries (tsx/esbuild). Run via:
 *   firebase emulators:exec --only firestore --project demo-estratega "node scripts/rules-test.mjs"
 *
 * Validates the rulesets authored for the multi-tenant redesign:
 *   - firestore.tenant.rules     → per-tenant isolation + claims-based RBAC
 *   - firestore.control-plane.rules → platformAdmin gating + own-tenant reads
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

let pass = 0;
let fail = 0;
async function check(name, promise) {
  try {
    await promise;
    pass++;
    console.log('  ✓', name);
  } catch (e) {
    fail++;
    console.log('  ✗', name, '->', e?.message || e);
  }
}

const TENANT = 'acme';

// ---------------------------------------------------------------------------
// TENANT ruleset (bound to tenantId "acme")
// ---------------------------------------------------------------------------
const tenantRules = readFileSync('firestore.tenant.rules', 'utf8').split('__TENANT_ID__').join(TENANT);

const tenantEnv = await initializeTestEnvironment({
  projectId: 'demo-tenant',
  firestore: { rules: tenantRules },
});

// Seed role docs (get() inside rules reads these; seeding bypasses rules).
await tenantEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'roles', 'admin'), { name: 'Admin', permissions: [] });
  await setDoc(doc(db, 'roles', 'viewer'), { name: 'Viewer', permissions: ['voter:read'] });
  await setDoc(doc(db, 'voters', 'v1'), { firstName: 'Seed' });
  await setDoc(doc(db, 'users', 'u3'), { firstName: 'Self' });
});

const adminCtx = tenantEnv.authenticatedContext('u1', { tenantId: TENANT, roleId: 'admin' });
const viewerCtx = tenantEnv.authenticatedContext('u3', { tenantId: TENANT, roleId: 'viewer' });
const otherTenantCtx = tenantEnv.authenticatedContext('u2', { tenantId: 'otra-empresa', roleId: 'admin' });
const anonCtx = tenantEnv.unauthenticatedContext();

console.log('TENANT ruleset (tenantId="acme"):');
await check('admin role can read voters', assertSucceeds(getDoc(doc(adminCtx.firestore(), 'voters', 'v1'))));
await check('admin role can write voters', assertSucceeds(setDoc(doc(adminCtx.firestore(), 'voters', 'v9'), { firstName: 'New' })));
await check('viewer can read voters (voter:read)', assertSucceeds(getDoc(doc(viewerCtx.firestore(), 'voters', 'v1'))));
await check('viewer CANNOT create voters (no voter:create)', assertFails(setDoc(doc(viewerCtx.firestore(), 'voters', 'v2'), { firstName: 'X' })));
await check('viewer can read their OWN user doc', assertSucceeds(getDoc(doc(viewerCtx.firestore(), 'users', 'u3'))));
await check('viewer CANNOT read another user doc', assertFails(getDoc(doc(viewerCtx.firestore(), 'users', 'u1'))));
await check('ISOLATION: other tenant CANNOT read voters', assertFails(getDoc(doc(otherTenantCtx.firestore(), 'voters', 'v1'))));
await check('ISOLATION: other tenant CANNOT write voters', assertFails(setDoc(doc(otherTenantCtx.firestore(), 'voters', 'v3'), { firstName: 'Y' })));
await check('unauthenticated CANNOT read voters', assertFails(getDoc(doc(anonCtx.firestore(), 'voters', 'v1'))));

await tenantEnv.cleanup();

// ---------------------------------------------------------------------------
// CONTROL PLANE ruleset
// ---------------------------------------------------------------------------
const cpRules = readFileSync('firestore.control-plane.rules', 'utf8');

const cpEnv = await initializeTestEnvironment({
  projectId: 'demo-control',
  firestore: { rules: cpRules },
});

await cpEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'tenants', TENANT), { displayName: 'Acme', status: 'active' });
  await setDoc(doc(db, 'tenants', 'otra-empresa'), { displayName: 'Otra', status: 'active' });
});

const platformCtx = cpEnv.authenticatedContext('op1', { platformAdmin: true });
const tenantUserCtx = cpEnv.authenticatedContext('u1', { tenantId: TENANT, roleId: 'admin' });

console.log('CONTROL PLANE ruleset:');
await check('platformAdmin can write a tenant', assertSucceeds(setDoc(doc(platformCtx.firestore(), 'tenants', 'nuevo'), { displayName: 'Nuevo' })));
await check('platformAdmin can read platformUsers', assertSucceeds(getDoc(doc(platformCtx.firestore(), 'platformUsers', 'op1'))));
await check('tenant user can read THEIR OWN tenant doc', assertSucceeds(getDoc(doc(tenantUserCtx.firestore(), 'tenants', TENANT))));
await check('tenant user CANNOT read another tenant doc', assertFails(getDoc(doc(tenantUserCtx.firestore(), 'tenants', 'otra-empresa'))));
await check('tenant user CANNOT write tenants (platform only)', assertFails(setDoc(doc(tenantUserCtx.firestore(), 'tenants', TENANT), { displayName: 'Hack' })));
await check('tenant user CANNOT write platformRoles', assertFails(setDoc(doc(tenantUserCtx.firestore(), 'platformRoles', 'r1'), { name: 'x' })));

await cpEnv.cleanup();

console.log(`\nRESULTADO: ${pass} pasaron, ${fail} fallaron`);
process.exit(fail === 0 ? 0 : 1);
