'use client';

/**
 * @fileoverview Client-side helper to obtain a Firestore instance bound to a
 * tenant's **named** database (not the `(default)` Control Plane database).
 *
 * The active tenant's `databaseId` is resolved at login from the user's custom
 * claims + the `tenants/{tenantId}` registry document (see Control Plane), then
 * the resulting Firestore instance is injected into the app via FirebaseProvider.
 */

import { getApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// One Firestore client per named database, reused across the session.
const cache = new Map<string, Firestore>();

/**
 * Returns the Firestore client for the given tenant database id.
 * Throws on the reserved `(default)` id (that is the Control Plane database).
 */
export function getTenantFirestore(databaseId: string): Firestore {
  if (!databaseId || databaseId === '(default)') {
    throw new Error(`getTenantFirestore requiere un databaseId de tenant válido (recibido: "${databaseId}").`);
  }
  const cached = cache.get(databaseId);
  if (cached) return cached;
  const db = getFirestore(getApp(), databaseId);
  cache.set(databaseId, db);
  return db;
}

// --- Platform-admin impersonation ("enter tenant") -------------------------
// When a platform operator opens a tenant, we remember the target database in
// sessionStorage so the provider resolves the connection to that tenant's DB.

const IMPERSONATION_KEY = 'cp:impersonatedDatabaseId';

export function getImpersonatedDatabaseId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(IMPERSONATION_KEY);
}

export function setImpersonatedDatabaseId(databaseId: string | null): void {
  if (typeof window === 'undefined') return;
  if (databaseId) window.sessionStorage.setItem(IMPERSONATION_KEY, databaseId);
  else window.sessionStorage.removeItem(IMPERSONATION_KEY);
}
