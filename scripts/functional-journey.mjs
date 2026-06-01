/**
 * Functional E2E data journey against the Firestore emulator.
 * Simulates an authenticated tenant admin (custom claims tenantId+roleId)
 * performing a realistic stateful flow through the REAL security-rules engine:
 *   create campaign → read back → update → create voter → list → delete.
 *
 * Plain ESM JS (no native binaries). Run via:
 *   firebase emulators:exec --only firestore --project demo-estratega "node scripts/functional-journey.mjs"
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const TENANT = 'acme';
const rules = readFileSync('firestore.tenant.rules', 'utf8').split('__TENANT_ID__').join(TENANT);

const env = await initializeTestEnvironment({
  projectId: 'demo-journey',
  firestore: { rules },
});

// Seed the admin role (read by the rules' get()).
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'roles', 'admin'), { name: 'Admin', permissions: [] });
});

const db = env.authenticatedContext('u1', { tenantId: TENANT, roleId: 'admin' }).firestore();

let step = 0;
const ok = (m) => console.log(`  ✓ [${++step}] ${m}`);

// 1) Create a campaign
await setDoc(doc(db, 'campaigns', 'c1'), {
  name: 'Campaña 2026', status: 'En Campaña', campaignType: 'alcaldia',
  goal: 'Ganar', startDate: '2026-01-01', endDate: '2026-06-01', progress: 0,
});
ok('crear campaña');

// 2) Read it back and verify contents persisted
let snap = await getDoc(doc(db, 'campaigns', 'c1'));
assert.equal(snap.exists(), true);
assert.equal(snap.data().name, 'Campaña 2026');
ok('leer campaña de vuelta (datos correctos)');

// 3) Update status
await updateDoc(doc(db, 'campaigns', 'c1'), { status: 'Finalizada' });
snap = await getDoc(doc(db, 'campaigns', 'c1'));
assert.equal(snap.data().status, 'Finalizada');
ok('actualizar estado de campaña');

// 4) Create voters
await setDoc(doc(db, 'voters', 'v1'), { firstName: 'Ana', lastName: 'Gómez', status: 'activo' });
await setDoc(doc(db, 'voters', 'v2'), { firstName: 'Luis', lastName: 'Pérez', status: 'activo' });
ok('crear 2 votantes');

// 5) List voters
const voters = await getDocs(collection(db, 'voters'));
assert.equal(voters.size, 2);
ok(`listar votantes (${voters.size})`);

// 6) Delete the campaign
await deleteDoc(doc(db, 'campaigns', 'c1'));
snap = await getDoc(doc(db, 'campaigns', 'c1'));
assert.equal(snap.exists(), false);
ok('borrar campaña (ya no existe)');

await env.cleanup();
console.log(`\nJOURNEY FUNCIONAL: ${step} pasos completados sin error`);
process.exit(0);
