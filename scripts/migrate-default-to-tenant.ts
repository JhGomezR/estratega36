/**
 * Migration: copy business data from the `(default)` database (legacy flat
 * model) into a tenant's dedicated named database.
 *
 * USAGE (staging first, never on prod without a fresh backup):
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
 *   tsx scripts/migrate-default-to-tenant.ts --database tenant-acme [--dry-run]
 *
 * Properties:
 *  - Idempotent: re-running overwrites destination docs with the same ids.
 *  - Batched: writes in chunks of 400 (< Firestore's 500-op batch limit).
 *  - Verifies source/destination counts at the end.
 *
 * It does NOT delete anything from `(default)`. Emptying the legacy collections
 * is a separate, deliberate step AFTER verification (see the runbook).
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// Top-level business collections to migrate (control-plane collections excluded).
const ROOT_COLLECTIONS = [
  'users', 'roles', 'campaigns', 'voters', 'tasks', 'calls',
  'strategies', 'forms', 'lists', 'settings', 'keywords', 'socialMentions',
  'auditLogs', 'routes', 'sms_messages',
];

// Colecciones legacy que NO se copian porque su contenido debe consolidarse
// antes en su colección canónica. `audit_logs` (snake_case) es el histórico
// real; su destino es `auditLogs` vía `scripts/consolidate-audit-logs.ts`.
// Migrarla tal cual reproduciría la duplicidad dentro de cada tenant.
const LEGACY_CONSOLIDATED_COLLECTIONS: Record<string, string> = {
  audit_logs: 'auditLogs',
};

/** Marca que `consolidate-audit-logs.ts` pone en cada entrada que copia. */
const LEGACY_AUDIT_SOURCE = 'legacy:audit_logs';

// Colecciones del Control Plane: viven SOLO en `(default)` y nunca se copian a
// la base de un tenant. Se listan para que el detector de colecciones nuevas no
// las reporte como olvidadas.
const CONTROL_PLANE_COLLECTIONS = [
  'tenants', 'platformUsers', 'platformRoles', 'platformStats',
];

// Geographic data is nested: countries/{c}/departments/{d}/cities/{ct}.
const GEO_ROOT = 'countries';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const databaseId = get('--database');
  const dryRun = args.includes('--dry-run');
  if (!databaseId) {
    console.error('Falta --database <tenantDatabaseId>');
    process.exit(1);
  }
  return { databaseId, dryRun };
}

async function copyCollection(
  src: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query,
  destDb: Firestore,
  destPath: string,
  dryRun: boolean
): Promise<number> {
  const snap = await src.get();
  if (snap.empty) return 0;

  let batch = destDb.batch();
  let ops = 0;
  let total = 0;

  for (const doc of snap.docs) {
    if (!dryRun) {
      batch.set(destDb.collection(destPath).doc(doc.id), doc.data());
      ops++;
      if (ops >= 400) {
        await batch.commit();
        batch = destDb.batch();
        ops = 0;
      }
    }
    total++;
  }
  if (!dryRun && ops > 0) await batch.commit();
  return total;
}

async function migrateGeo(srcDb: Firestore, destDb: Firestore, dryRun: boolean): Promise<number> {
  let total = 0;
  const countries = await srcDb.collection(GEO_ROOT).get();
  for (const country of countries.docs) {
    if (!dryRun) await destDb.collection(GEO_ROOT).doc(country.id).set(country.data());
    total++;
    const departments = await country.ref.collection('departments').get();
    for (const dept of departments.docs) {
      const deptPath = `${GEO_ROOT}/${country.id}/departments`;
      if (!dryRun) await destDb.collection(deptPath).doc(dept.id).set(dept.data());
      total++;
      const cityPath = `${deptPath}/${dept.id}/cities`;
      total += await copyCollection(dept.ref.collection('cities'), destDb, cityPath, dryRun);
    }
  }
  return total;
}

async function main() {
  const { databaseId, dryRun } = parseArgs();

  if (!getApps().length) {
    // Con `FIRESTORE_EMULATOR_HOST` se inicializa SIN credenciales, para poder
    // validar el script (incluida la puerta de consolidación) contra el
    // emulador sin tocar ningún proyecto real.
    initializeApp(
      process.env.FIRESTORE_EMULATOR_HOST
        ? { projectId: process.env.GCLOUD_PROJECT || 'demo-estratega' }
        : { credential: applicationDefault() }
    );
  }
  const srcDb = getFirestore(); // (default)
  const destDb = getFirestore(databaseId);

  console.log(`\nMigrando (default) → "${databaseId}"  ${dryRun ? '[DRY RUN]' : ''}\n`);

  await assertLegacyCollectionsConsolidated(srcDb);

  const report: Record<string, number> = {};
  for (const col of ROOT_COLLECTIONS) {
    report[col] = await copyCollection(srcDb.collection(col), destDb, col, dryRun);
    console.log(`  ${col.padEnd(16)} ${report[col]}`);
  }
  report[GEO_ROOT] = await migrateGeo(srcDb, destDb, dryRun);
  console.log(`  ${GEO_ROOT.padEnd(16)} ${report[GEO_ROOT]} (incl. departments/cities)`);

  // Verification: compare top-level counts.
  console.log('\nVerificación de conteos:');
  let mismatch = false;
  for (const col of ROOT_COLLECTIONS) {
    const srcCount = (await srcDb.collection(col).count().get()).data().count;
    const destCount = dryRun ? srcCount : (await destDb.collection(col).count().get()).data().count;
    const ok = srcCount === destCount;
    if (!ok) mismatch = true;
    console.log(`  ${col.padEnd(16)} src=${srcCount} dest=${destCount} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // Red de seguridad: cualquier colección que EXISTA en el origen y no esté
  // contemplada aquí se perdería en silencio (así se habían quedado fuera
  // `audit_logs`, `routes` y `sms_messages`). Se detecta y se trata como fallo.
  const unlisted = await findUnlistedCollections(srcDb);
  if (unlisted.length > 0) {
    mismatch = true;
    console.error('\n⚠️  Colecciones presentes en (default) que NO se están migrando:');
    for (const col of unlisted) {
      const count = (await srcDb.collection(col).count().get()).data().count;
      console.error(`  ${col.padEnd(16)} ${count} docs  → añádela a ROOT_COLLECTIONS o a CONTROL_PLANE_COLLECTIONS`);
    }
  }

  console.log(`\n${dryRun ? 'DRY RUN completado.' : 'Migración completada.'}`);
  if (mismatch) {
    console.error('Hay diferencias de conteo o colecciones sin migrar. Revisa antes de continuar.');
    process.exit(2);
  }
}

/**
 * Puerta previa: `audit_logs` no se migra, se consolida antes en `auditLogs`.
 * Si el origen todavía tiene documentos legacy sin consolidar, la migración se
 * aborta — dejarla correr perdería el histórico en silencio (que es justo el
 * fallo que este script existe para evitar).
 */
async function assertLegacyCollectionsConsolidated(srcDb: Firestore): Promise<void> {
  for (const [legacyCol, canonicalCol] of Object.entries(LEGACY_CONSOLIDATED_COLLECTIONS)) {
    const legacyCount = (await srcDb.collection(legacyCol).count().get()).data().count;
    if (legacyCount === 0) continue;

    const consolidated = (
      await srcDb.collection(canonicalCol).where('source', '==', LEGACY_AUDIT_SOURCE).count().get()
    ).data().count;

    if (consolidated < legacyCount) {
      console.error(
        `\n⛔ \`${legacyCol}\` tiene ${legacyCount} docs y solo ${consolidated} están consolidados en \`${canonicalCol}\`.`
      );
      console.error('   Ejecuta primero:  npx tsx scripts/consolidate-audit-logs.ts --dry-run');
      console.error('   y luego sin --dry-run. Después vuelve a lanzar esta migración.');
      process.exit(3);
    }
    console.log(`  ${legacyCol} ya consolidada en ${canonicalCol} (${consolidated}/${legacyCount}); no se migra.`);
  }
}

/** Colecciones raíz del origen que no están ni en la lista a migrar ni en la del control plane. */
async function findUnlistedCollections(srcDb: Firestore): Promise<string[]> {
  const known = new Set([
    ...ROOT_COLLECTIONS,
    ...CONTROL_PLANE_COLLECTIONS,
    ...Object.keys(LEGACY_CONSOLIDATED_COLLECTIONS),
    GEO_ROOT,
  ]);
  const present = await srcDb.listCollections();
  return present.map((c) => c.id).filter((id) => !known.has(id)).sort();
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});
