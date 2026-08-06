/**
 * @fileoverview Cumplimiento de los límites de plan en el servidor.
 *
 * Los límites (`maxUsers`, `maxRoles`) están DENORMALIZADOS en el documento del
 * tenant (`(default)/tenants/{id}`), igual que `planModules`, para verificarlos
 * sin leer la colección `plans`. Se usan desde las Server Actions de creación
 * (Admin SDK), que son el punto de control real (las reglas de Firestore no
 * pueden contar documentos). 0/ausente = ilimitado.
 */

import { adminDb } from '@/firebase/admin';
import type { CallerContext } from '@/firebase/authz';

async function tenantLimit(tenantId: string, field: 'maxUsers' | 'maxRoles' | 'maxCampaigns'): Promise<number> {
  const snap = await adminDb.collection('tenants').doc(tenantId).get();
  const value = (snap.data() as Record<string, unknown> | undefined)?.[field];
  return typeof value === 'number' && value > 0 ? value : 0; // 0 = ilimitado
}

/** Lanza si crear un usuario superaría el límite del plan del tenant. */
export async function assertWithinUserLimit(ctx: CallerContext): Promise<void> {
  if (!ctx.tenantId) return; // plataforma / legacy: sin límite
  const limit = await tenantLimit(ctx.tenantId, 'maxUsers');
  if (!limit) return;
  const snap = await ctx.db.collection('users').get();
  if (snap.size >= limit) {
    throw new Error(
      `Has alcanzado el límite de usuarios de tu plan (${limit}). Contacta al administrador de la plataforma para ampliarlo.`
    );
  }
}

/** Lanza si crear un rol superaría el límite del plan del tenant. */
export async function assertWithinRoleLimit(ctx: CallerContext): Promise<void> {
  if (!ctx.tenantId) return;
  const limit = await tenantLimit(ctx.tenantId, 'maxRoles');
  if (!limit) return;
  const snap = await ctx.db.collection('roles').get();
  // Los roles borrados (soft-delete `trash: true`) no cuentan.
  const count = snap.docs.filter((d) => (d.data() as { trash?: boolean }).trash !== true).length;
  if (count >= limit) {
    throw new Error(
      `Has alcanzado el límite de roles de tu plan (${limit}). Contacta al administrador de la plataforma para ampliarlo.`
    );
  }
}

/**
 * Lanza si crear una campaña superaría el límite del plan. Las campañas
 * archivadas (retiradas) NO cuentan para el límite.
 */
export async function assertWithinCampaignLimit(ctx: CallerContext): Promise<void> {
  if (!ctx.tenantId) return;
  const limit = await tenantLimit(ctx.tenantId, 'maxCampaigns');
  if (!limit) return;
  const snap = await ctx.db.collection('campaigns').get();
  const count = snap.docs.filter((d) => (d.data() as { status?: string }).status !== 'Archivada').length;
  if (count >= limit) {
    throw new Error(
      `Has alcanzado el límite de campañas de tu plan (${limit}). Contacta al administrador de la plataforma para ampliarlo.`
    );
  }
}
