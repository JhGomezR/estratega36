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
    // In a managed Google Cloud environment (like App Hosting or Cloud Run),
    // initializing without arguments uses the Application Default Credentials.
    const app = admin.initializeApp();
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

export { adminApp, adminAuth, adminDb };
