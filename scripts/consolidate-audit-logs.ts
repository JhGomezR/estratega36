/**
 * Consolidación: copia el histórico de auditoría de la colección LEGACY
 * `audit_logs` (snake_case, ~1917 docs en producción) a la colección CANÓNICA
 * `auditLogs` (camelCase), normalizando el esquema por el camino.
 *
 * Por qué `auditLogs` es la canónica: es la que escribe el código
 * (`src/lib/audit-log.ts`), la única cubierta por `firestore.tenant.rules` y
 * `firestore.control-plane.rules`, y la que tiene índices en
 * `firestore.indexes.json`. `audit_logs` no tiene reglas propias salvo el
 * parche transitorio de `firestore.default-transitional.rules`.
 *
 * USAGE (staging primero; en producción, solo con backup/PITR reciente):
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
 *   npx tsx scripts/consolidate-audit-logs.ts [--database <id>] [--dry-run]
 *
 * Ejecutar SIEMPRE el dry-run antes: imprime el informe de esquema (tipos de
 * evento, colecciones no mapeadas, documentos sin fecha o sin usuario) sin
 * escribir nada.
 *
 * Propiedades:
 *  - Idempotente: cada documento se escribe en `auditLogs` con SU MISMO id y
 *    con la marca `source: 'legacy:audit_logs'`. Re-ejecutar reescribe lo mismo.
 *  - No pisa entradas nativas: si en destino ya existe un doc con ese id que NO
 *    lleva la marca legacy, se salta y se reporta (nunca se sobrescribe una
 *    entrada escrita por la app).
 *  - Por lotes: lee en páginas de 400 y escribe en batches de 400 (< 500).
 *  - Verifica conteos al final (origen vs. destino consolidado).
 *
 * NO borra nada de `audit_logs`. Vaciar/eliminar la colección legacy es un paso
 * posterior y deliberado, tras verificar (ver docs/multi-tenant-runbook.md).
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldPath, type Firestore } from 'firebase-admin/firestore';
import {
  AUDIT_COLLECTION,
  LEGACY_AUDIT_COLLECTION,
  LEGACY_AUDIT_SOURCE,
  normalizeLegacyAuditLog,
  type LegacyAuditLog,
  type NormalizeWarning,
} from '../src/lib/audit-log-normalize';

/** Tamaño de página de lectura y de batch de escritura (límite Firestore: 500). */
const PAGE_SIZE = 400;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    // Sin `--database` se opera sobre `(default)`, que es donde vive el histórico.
    databaseId: get('--database'),
    dryRun: args.includes('--dry-run'),
  };
}

type Report = {
  read: number;
  written: number;
  skippedNative: number;
  byAction: Record<string, number>;
  warnings: Record<NormalizeWarning, number>;
  skippedIds: string[];
};

function emptyReport(): Report {
  return {
    read: 0,
    written: 0,
    skippedNative: 0,
    byAction: {},
    warnings: {
      'missing-userId': 0,
      'missing-timestamp': 0,
      'unknown-eventType': 0,
      'unmapped-collectionName': 0,
    },
    skippedIds: [],
  };
}

/**
 * Recorre `audit_logs` paginando por id de documento (estable y reanudable) y
 * escribe la versión normalizada en `auditLogs`.
 */
async function consolidate(db: Firestore, dryRun: boolean): Promise<Report> {
  const report = emptyReport();
  const srcCol = db.collection(LEGACY_AUDIT_COLLECTION);
  const destCol = db.collection(AUDIT_COLLECTION);

  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  for (;;) {
    let query = srcCol.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    // Colisiones de id: leemos el destino de esta página de una sola vez.
    const destRefs = page.docs.map((d) => destCol.doc(d.id));
    const destSnaps = await db.getAll(...destRefs);
    const nativeIds = new Set(
      destSnaps
        .filter((s) => s.exists && s.get('source') !== LEGACY_AUDIT_SOURCE)
        .map((s) => s.id)
    );

    const batch = db.batch();
    let ops = 0;

    for (const doc of page.docs) {
      report.read++;

      if (nativeIds.has(doc.id)) {
        report.skippedNative++;
        if (report.skippedIds.length < 20) report.skippedIds.push(doc.id);
        continue;
      }

      const { entry, warnings } = normalizeLegacyAuditLog(doc.data() as LegacyAuditLog);
      report.byAction[entry.action] = (report.byAction[entry.action] ?? 0) + 1;
      for (const w of warnings) report.warnings[w]++;

      if (!dryRun) {
        batch.set(destCol.doc(doc.id), entry);
        ops++;
      }
      report.written++;
    }

    if (!dryRun && ops > 0) await batch.commit();

    cursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
    console.log(`  … ${report.read} leídos`);
  }

  return report;
}

/** Conteo de entradas del destino que provienen de la consolidación. */
async function countConsolidated(db: Firestore): Promise<number> {
  const snap = await db
    .collection(AUDIT_COLLECTION)
    .where('source', '==', LEGACY_AUDIT_SOURCE)
    .count()
    .get();
  return snap.data().count;
}

async function main() {
  const { databaseId, dryRun } = parseArgs();

  if (!getApps().length) {
    // Con `FIRESTORE_EMULATOR_HOST` se inicializa SIN credenciales: así este
    // mismo script se valida contra el emulador (ver el harness del runbook)
    // sin tocar ningún proyecto real.
    initializeApp(
      process.env.FIRESTORE_EMULATOR_HOST
        ? { projectId: process.env.GCLOUD_PROJECT || 'demo-estratega' }
        : { credential: applicationDefault() }
    );
  }
  const db = databaseId ? getFirestore(databaseId) : getFirestore();
  const dbLabel = databaseId ?? '(default)';

  console.log(
    `\nConsolidando ${LEGACY_AUDIT_COLLECTION} → ${AUDIT_COLLECTION} en "${dbLabel}"  ${dryRun ? '[DRY RUN]' : ''}\n`
  );

  const srcCount = (await db.collection(LEGACY_AUDIT_COLLECTION).count().get()).data().count;
  const destCountBefore = (await db.collection(AUDIT_COLLECTION).count().get()).data().count;
  console.log(`  origen  ${LEGACY_AUDIT_COLLECTION.padEnd(12)} ${srcCount} docs`);
  console.log(`  destino ${AUDIT_COLLECTION.padEnd(12)} ${destCountBefore} docs (antes)\n`);

  const report = await consolidate(db, dryRun);

  console.log('\nInforme de esquema (acciones derivadas de eventType+collectionName):');
  for (const [action, n] of Object.entries(report.byAction).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${action.padEnd(28)} ${n}`);
  }

  const anomalies = Object.entries(report.warnings).filter(([, n]) => n > 0);
  if (anomalies.length > 0) {
    console.log('\nAnomalías (se migran igual; nada se descarta):');
    for (const [w, n] of anomalies) console.log(`  ${w.padEnd(28)} ${n}`);
  }

  if (report.skippedNative > 0) {
    console.warn(
      `\n⚠️  ${report.skippedNative} documento(s) NO copiados: ya existe en ${AUDIT_COLLECTION} un doc con ese id escrito por la app.`
    );
    console.warn(`   ids (máx. 20): ${report.skippedIds.join(', ')}`);
    console.warn('   Revísalos a mano: reasignarles un id nuevo es una decisión, no un automatismo.');
  }

  // Verificación de conteos.
  console.log('\nVerificación:');
  const consolidated = dryRun ? report.written : await countConsolidated(db);
  const expected = srcCount - report.skippedNative;
  const ok = report.read === srcCount && consolidated === expected;
  console.log(`  leídos de ${LEGACY_AUDIT_COLLECTION}: ${report.read} (count=${srcCount})`);
  console.log(`  con source=${LEGACY_AUDIT_SOURCE} en ${AUDIT_COLLECTION}: ${consolidated} (esperado ${expected})`);
  if (!dryRun) {
    const destCountAfter = (await db.collection(AUDIT_COLLECTION).count().get()).data().count;
    console.log(`  total ${AUDIT_COLLECTION}: ${destCountAfter} docs (después)`);
  }

  console.log(`\n${dryRun ? 'DRY RUN completado (no se escribió nada).' : 'Consolidación completada.'}`);
  if (!ok || report.skippedNative > 0) {
    console.error('Hay diferencias de conteo o documentos sin copiar. Revisa antes de continuar.');
    process.exit(2);
  }
  console.log(
    `\nSiguiente paso (manual, tras verificar): vaciar/eliminar ${LEGACY_AUDIT_COLLECTION} y su bloque en firestore.default-transitional.rules.`
  );
}

main().catch((err) => {
  console.error('Consolidación falló:', err);
  process.exit(1);
});
