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
    initializeApp({ credential: applicationDefault() });
  }
  const srcDb = getFirestore(); // (default)
  const destDb = getFirestore(databaseId);

  console.log(`\nMigrando (default) → "${databaseId}"  ${dryRun ? '[DRY RUN]' : ''}\n`);

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

  console.log(`\n${dryRun ? 'DRY RUN completado.' : 'Migración completada.'}`);
  if (mismatch) {
    console.error('Hay diferencias de conteo. Revisa antes de continuar.');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});
