/**
 * @fileoverview Server-side authorization for Server Actions. Because Server
 * Actions use the Admin SDK (which BYPASSES Firestore security rules), every
 * mutating action MUST verify the caller's identity and permissions here.
 *
 * Resolves the caller into a scope + a Firestore handle + their permission set:
 *   - platformAdmin            → full access (control plane operator)
 *   - tenant member (claims)   → permissions from role in the tenant DB
 *   - legacy user (no claims)  → permissions from role in `(default)` DB
 *
 * The returned `db` is the database the caller is allowed to mutate, so actions
 * write to the correct scope for both legacy and migrated tenants.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { adminDb, getTenantDb } from '@/firebase/admin';
import { verifyCaller } from '@/firebase/claims';

export interface CallerContext {
  uid: string;
  email?: string;
  isPlatformAdmin: boolean;
  scope: 'platform' | 'tenant' | 'legacy';
  /** Firestore handle the caller is authorized to operate on. */
  db: Firestore;
  /** Effective permission set ("module:action"). Empty for platform (bypass). */
  permissions: Set<string>;
}

const ADMIN_ROLE_NAMES = ['admin', 'super', 'super_admin', 'administrador'];

async function permissionsFromRole(db: Firestore, roleId: string | undefined): Promise<Set<string>> {
  if (!roleId) return new Set();
  const roleSnap = await db.collection('roles').doc(roleId).get();
  if (!roleSnap.exists) return new Set();
  const role = roleSnap.data() as { name?: string; permissions?: string[] };
  // Admin-named roles get everything (mirrors the rules' admin bypass).
  if (role.name && ADMIN_ROLE_NAMES.includes(role.name.toLowerCase())) {
    return new Set(['*']);
  }
  return new Set(role.permissions || []);
}

/** Verifies the ID token and resolves the caller's scope + permissions. */
export async function getCallerContext(idToken: string | undefined | null): Promise<CallerContext> {
  const decoded = await verifyCaller(idToken);

  if (decoded.platformAdmin === true) {
    return {
      uid: decoded.uid,
      email: decoded.email,
      isPlatformAdmin: true,
      scope: 'platform',
      db: adminDb,
      permissions: new Set(['*']),
    };
  }

  const tenantId = decoded.tenantId as string | undefined;
  const roleId = decoded.roleId as string | undefined;

  if (tenantId && roleId) {
    // Resolve the tenant's database from the control-plane registry.
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    const databaseId = (tenantSnap.data() as { databaseId?: string } | undefined)?.databaseId;
    if (!databaseId) throw new Error('Tenant no encontrado o sin base de datos.');
    const db = getTenantDb(databaseId);
    return {
      uid: decoded.uid,
      email: decoded.email,
      isPlatformAdmin: false,
      scope: 'tenant',
      db,
      permissions: await permissionsFromRole(db, roleId),
    };
  }

  // Legacy user (pre-migration): role lives in the (default) database.
  const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
  const legacyRoleId = (userSnap.data() as { roleId?: string } | undefined)?.roleId;
  return {
    uid: decoded.uid,
    email: decoded.email,
    isPlatformAdmin: false,
    scope: 'legacy',
    db: adminDb,
    permissions: await permissionsFromRole(adminDb, legacyRoleId),
  };
}

/** True if the caller holds a permission (platform/admin wildcards included). */
export function can(ctx: CallerContext, permission: string): boolean {
  return ctx.isPlatformAdmin || ctx.permissions.has('*') || ctx.permissions.has(permission);
}

/** Throws unless the caller holds the permission. */
export function assertCan(ctx: CallerContext, permission: string): void {
  if (!can(ctx, permission)) {
    throw new Error(`No autorizado: falta el permiso "${permission}".`);
  }
}
