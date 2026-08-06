/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// This function ensures the Admin SDK app is initialized only once (singleton).
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  try {
    // Two supported credential modes:
    //  1) FIREBASE_SERVICE_ACCOUNT_KEY = the service-account JSON (as a string).
    //     Used for self-hosted/containerized deploys (Docker, Hostinger, etc.)
    //     where mounting a key file is awkward.
    //  2) No env var → Application Default Credentials (GCP App Hosting/Cloud Run,
    //     or a GOOGLE_APPLICATION_CREDENTIALS file path).
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let app: admin.app.App;
    if (saKey) {
      const parsed = JSON.parse(saKey);
      app = admin.initializeApp({
        credential: admin.credential.cert(parsed),
        // Sin esto, adminApp.options.projectId queda vacío en el contenedor
        // (no hay GOOGLE_CLOUD_PROJECT), y getProjectId() falla al aprovisionar
        // tenants ("No se pudo resolver el projectId de GCP").
        projectId: parsed.project_id,
      });
    } else {
      app = admin.initializeApp();
    }
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // Re-throwing the error makes it visible during development and in logs.
    throw new Error(
      `Failed to initialize Firebase Admin SDK. Error: ${error.message}`
    );
  }
}

const adminApp = getAdminApp();

/** Firebase Auth (Admin). */
const adminAuth = adminApp.auth();

/**
 * The `(default)` database == the **Control Plane** (tenants registry,
 * platform users/roles, stats, audit logs). Tenant business data lives in
 * per-tenant named databases — use `getTenantDb(databaseId)` for those.
 */
const adminDb = admin.firestore();

// Cache one Firestore client per named tenant database.
const tenantDbCache = new Map<string, Firestore>();

/**
 * Returns the Admin Firestore client for a tenant's named database.
 * Callers MUST resolve `databaseId` from the verified custom claim / tenant
 * registry — never from raw client input.
 */
export function getTenantDb(databaseId: string): Firestore {
  if (!databaseId || databaseId === '(default)') {
    throw new Error(`getTenantDb requiere un databaseId de tenant válido (recibido: "${databaseId}").`);
  }
  const cached = tenantDbCache.get(databaseId);
  if (cached) return cached;
  const db = getFirestore(adminApp, databaseId);
  tenantDbCache.set(databaseId, db);
  return db;
}

/**
 * Base NOMBRADA dedicada a la auditoría de TODA la plataforma (acciones de
 * operadores y de todos los tenants), aislada de las bases de negocio. Solo el
 * Admin SDK la toca; ningún cliente (ni tenant) se conecta a ella. Los logs
 * quedan etiquetados por `tenantId` (o `'platform'`) y sobreviven al borrado
 * del tenant.
 */
export const LOGS_DATABASE_ID = 'estratega-logs';

/** Cliente Admin Firestore de la base central de logs. */
export function getLogsDb(): Firestore {
  return getTenantDb(LOGS_DATABASE_ID);
}

export { adminApp, adminAuth, adminDb };
