/**
 * @fileoverview Server-side helpers for Firebase Auth **custom claims**, the
 * backbone of tenant resolution in the multi-tenant architecture.
 *
 * Claims model:
 *   - Platform operators:  { platformAdmin: true }
 *   - Tenant users:        { tenantId: string, roleId: string }
 *
 * A user belongs to a single ACTIVE tenant at a time. If their tenant is
 * deactivated, their claims can be reassigned to another tenant.
 *
 * IMPORTANT: this module uses the Admin SDK and must ONLY run server-side
 * (Server Actions / route handlers). Never import it into client code.
 */

import { adminAuth, adminDb } from '@/firebase/admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export interface PlatformClaims {
  platformAdmin?: boolean;
  tenantId?: string;
  roleId?: string;
}

/** Marks a user as a Control Plane operator (full platform access). */
export async function setPlatformAdminClaim(uid: string): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, { platformAdmin: true });
}

/** Assigns a user to a tenant with a given role. Replaces any previous claims. */
export async function setTenantClaims(uid: string, tenantId: string, roleId: string): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, { tenantId, roleId });
}

/** Clears tenant assignment (e.g. when a tenant is deactivated and the user is freed). */
export async function clearTenantClaims(uid: string): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, {});
}

/**
 * Verifies an ID token sent by the client and returns the decoded token.
 * Throws if the token is missing or invalid.
 *
 * `checkRevoked: true` ensures a disabled/revoked session is rejected.
 */
export async function verifyCaller(idToken: string | undefined | null): Promise<DecodedIdToken> {
  if (!idToken) {
    throw new Error('No autenticado: falta el token de sesión.');
  }
  try {
    return await adminAuth.verifyIdToken(idToken, true);
  } catch {
    throw new Error('Sesión inválida o expirada. Vuelve a iniciar sesión.');
  }
}

/** Asserts the caller is a platform operator. Returns the decoded token. */
export async function requirePlatformAdmin(idToken: string | undefined | null): Promise<DecodedIdToken> {
  const decoded = await verifyCaller(idToken);
  if (decoded.platformAdmin !== true) {
    throw new Error('No autorizado: se requiere acceso de plataforma.');
  }
  return decoded;
}

/**
 * Como requirePlatformAdmin, pero además exige un permiso GRANULAR del rol de
 * plataforma del operador (RBAC). Un operador "bootstrap" sin documento de rol,
 * o con un rol super/admin, tiene acceso total (evita bloquear al fundador). El
 * resto debe tener el permiso en su rol.
 */
export async function requirePlatformPermission(
  idToken: string | undefined | null,
  permission: string
): Promise<DecodedIdToken> {
  const decoded = await requirePlatformAdmin(idToken);
  const puSnap = await adminDb.collection('platformUsers').doc(decoded.uid).get();
  const roleId = puSnap.exists ? (puSnap.data() as { roleId?: string } | undefined)?.roleId : undefined;
  if (!roleId) return decoded; // operador sin rol asignado → acceso total
  const roleSnap = await adminDb.collection('platformRoles').doc(roleId).get();
  const role = roleSnap.exists ? (roleSnap.data() as { name?: string; permissions?: string[] } | undefined) : undefined;
  const name = (role?.name || '').toLowerCase();
  const perms = role?.permissions || [];
  if (name.includes('super') || name.includes('admin') || perms.includes(permission)) return decoded;
  throw new Error('No autorizado: tu rol de plataforma no incluye este permiso.');
}

/**
 * Asserts the caller is a tenant user and returns its identity.
 * Server actions MUST use the returned tenantId to scope data access —
 * never trust a tenantId/databaseId supplied by the client.
 */
export async function requireTenantCaller(
  idToken: string | undefined | null
): Promise<{ uid: string; tenantId: string; roleId: string }> {
  const decoded = await verifyCaller(idToken);
  const tenantId = decoded.tenantId as string | undefined;
  const roleId = decoded.roleId as string | undefined;
  if (!tenantId || !roleId) {
    throw new Error('No autorizado: el usuario no está asignado a ningún tenant.');
  }
  return { uid: decoded.uid, tenantId, roleId };
}
