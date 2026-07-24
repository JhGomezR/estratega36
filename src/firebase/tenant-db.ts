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
// When a platform operator opens a tenant, we remember the target in
// sessionStorage so the provider resolves the connection to that tenant's DB.
//
// We store the `tenantId` too (not only the `databaseId`) because:
//   - Server Actions receive the tenantId and resolve the databaseId themselves
//     from the `tenants/{id}` registry (a client must never pick a raw DB).
//   - The impersonation banner needs a human-readable label.

const DB_KEY = 'cp:impersonatedDatabaseId';
const TENANT_KEY = 'cp:impersonatedTenantId';
const NAME_KEY = 'cp:impersonatedTenantName';

export interface ImpersonationSession {
  tenantId: string;
  databaseId: string;
  /** Display name, only for the UI banner. */
  displayName?: string;
}

export function getImpersonatedDatabaseId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(DB_KEY);
}

/** Tenant currently being impersonated — pass this to Server Actions. */
export function getImpersonatedTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TENANT_KEY);
}

/** Full impersonation session, or null when the operator is on the control plane. */
export function getImpersonation(): ImpersonationSession | null {
  if (typeof window === 'undefined') return null;
  const tenantId = window.sessionStorage.getItem(TENANT_KEY);
  const databaseId = window.sessionStorage.getItem(DB_KEY);
  if (!tenantId || !databaseId) return null;
  return {
    tenantId,
    databaseId,
    displayName: window.sessionStorage.getItem(NAME_KEY) || undefined,
  };
}

/** Starts impersonating a tenant (Control Plane → "Entrar al tenant"). */
export function setImpersonation(session: ImpersonationSession): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(TENANT_KEY, session.tenantId);
  window.sessionStorage.setItem(DB_KEY, session.databaseId);
  if (session.displayName) window.sessionStorage.setItem(NAME_KEY, session.displayName);
  else window.sessionStorage.removeItem(NAME_KEY);
}

/** Ends impersonation. The caller must force a reload so the provider re-resolves. */
export function clearImpersonation(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TENANT_KEY);
  window.sessionStorage.removeItem(DB_KEY);
  window.sessionStorage.removeItem(NAME_KEY);
}
