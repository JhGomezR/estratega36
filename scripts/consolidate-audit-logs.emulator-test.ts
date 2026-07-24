/**
 * Prueba de `scripts/consolidate-audit-logs.ts` contra el EMULADOR de Firestore.
 *
 *   npm run test:consolidate
 *
 * La normalización pura ya está cubierta por Jest
 * (`src/lib/audit-log-normalize.test.ts`); lo que aquí se valida es la mecánica
 * que Jest no puede tocar: paginación, escritura por lotes, idempotencia,
 * detección de colisiones de id y la puerta de consolidación de
 * `migrate-default-to-tenant.ts`.
 *
 * Nunca toca un proyecto real: `emulators:exec` inyecta `FIRESTORE_EMULATOR_HOST`
 * y ambos scripts, al verlo, se inicializan sin credenciales.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { spawnSync } from 'node:child_process';

const LEGACY_N = 950; // > 2 páginas de 400 ⇒ ejercita la paginación

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Este test SOLO corre contra el emulador. Usa: npm run test:consolidate');
  process.exit(1);
}

if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-estratega' });
const db = getFirestore();

function runScript(script: string, args: string[]) {
  const r = spawnSync('npx', ['tsx', script, ...args], {
    cwd: process.cwd(), encoding: 'utf8', shell: true,
  });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const consolidate = (...args: string[]) => runScript('scripts/consolidate-audit-logs.ts', args);
const migrate = () =>
  runScript('scripts/migrate-default-to-tenant.ts', ['--database', 'tenant-x', '--dry-run']);

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { console.error(`  ✗ ${msg}`); failures++; }
}

async function wipe(col: string) {
  for (;;) {
    const snap = await db.collection(col).limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/** Siembra `audit_logs` con la forma REAL del logger legacy (commit 2a1bcff). */
async function seedLegacy() {
  const eventTypes = ['login', 'logout', 'create', 'update', 'delete', 'view'];
  const collections = ['users', 'voters', 'campaigns', 'tasks'];
  let batch = db.batch();
  for (let i = 0; i < LEGACY_N; i++) {
    batch.set(db.collection('audit_logs').doc(`legacy-${String(i).padStart(4, '0')}`), {
      userId: `uid-${i % 7}`,
      userEmail: `user${i % 7}@example.com`,
      timestamp: new Date(Date.UTC(2026, 0, 1 + (i % 28))).toISOString(),
      eventType: eventTypes[i % eventTypes.length],
      collectionName: collections[i % collections.length],
      documentId: `doc-${i}`,
      details: { n: i },
    });
    if ((i + 1) % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  // Caso límite: sin userId, sin fecha, eventType desconocido y clave extra.
  batch.set(db.collection('audit_logs').doc('legacy-anomalo'), {
    eventType: 'purge', collectionName: 'gizmos', sessionId: 'abc',
  });
  await batch.commit();
}

async function main() {
  console.log('\nPreparando emulador…');
  await wipe('audit_logs');
  await wipe('auditLogs');
  await seedLegacy();
  const srcN = (await db.collection('audit_logs').count().get()).data().count;
  console.log(`  sembrados ${srcN} documentos legacy`);

  console.log('\n1) dry-run — informa sin escribir');
  const dry = consolidate('--dry-run');
  assert(dry.code === 0, 'sale con código 0');
  assert((await db.collection('auditLogs').count().get()).data().count === 0,
    'auditLogs sigue vacía');
  assert(/user:login/.test(dry.out), 'el informe lista las acciones traducidas');
  assert(/unknown-eventType/.test(dry.out), 'el informe denuncia las anomalías');

  console.log('\n2) ejecución real');
  const real = consolidate();
  assert(real.code === 0, 'sale con código 0');
  const after = (await db.collection('auditLogs').count().get()).data().count;
  assert(after === srcN, `auditLogs tiene ${after} docs (esperado ${srcN})`);

  const sample = (await db.collection('auditLogs').doc('legacy-0000').get()).data()!;
  assert(sample.action === 'user:login', `traduce el action (${sample.action})`);
  assert(sample.source === 'legacy:audit_logs', 'marca la procedencia');
  assert(sample.legacy?.documentId === 'doc-0', 'conserva documentId en legacy');
  assert(sample.userEmail === 'user0@example.com', 'promueve userEmail');
  const anomalous = (await db.collection('auditLogs').doc('legacy-anomalo').get()).data()!;
  assert(anomalous.action === 'gizmo:purge' && anomalous.legacy?.extra?.sessionId === 'abc',
    'migra el doc anómalo sin perder claves desconocidas');

  console.log('\n3) idempotencia');
  const again = consolidate();
  assert(again.code === 0, 'la re-ejecución sale con código 0');
  assert((await db.collection('auditLogs').count().get()).data().count === srcN,
    'no duplica documentos');

  console.log('\n4) colisión con una entrada nativa');
  await db.collection('auditLogs').doc('legacy-0001').set({
    userId: 'nativo', action: 'voter:create', timestamp: '2026-07-01T00:00:00.000Z',
  });
  const collision = consolidate();
  assert(collision.code === 2, 'sale con código 2');
  assert(/NO copiados/.test(collision.out), 'reporta el documento no copiado');
  const native = (await db.collection('auditLogs').doc('legacy-0001').get()).data()!;
  assert(native.userId === 'nativo' && native.source === undefined,
    'la entrada nativa queda intacta');

  console.log('\n5) puerta de consolidación en migrate-default-to-tenant');
  // Rehacemos un estado consolidado LIMPIO: el paso 4 dejó legacy-0001 sin
  // consolidar a propósito (colisión), y la puerta —con razón— lo trataría
  // como "falta consolidar". Quitamos la entrada nativa y re-consolidamos.
  await wipe('auditLogs');
  assert(consolidate().code === 0, 'reconsolidación limpia para probar la puerta');
  const gateOk = migrate();
  assert(/ya consolidada en auditLogs/.test(gateOk.out),
    'con el histórico consolidado, no migra audit_logs');
  await wipe('auditLogs');
  const gateFail = migrate();
  assert(gateFail.code === 3, 'aborta con código 3 si falta consolidar');
  assert(/consolidate-audit-logs/.test(gateFail.out), 'indica qué script ejecutar');

  await wipe('audit_logs');
  await wipe('auditLogs');

  console.log(failures === 0 ? '\nTodo OK.' : `\n${failures} comprobación(es) fallida(s).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
