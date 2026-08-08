'use server';

/**
 * Control Plane — facturación/cobros de tenants. Sin pasarela: el operador
 * registra pagos a mano. La suspensión por impago es automática (por fecha, vía
 * `runBillingSweep`, o manual). Todo se audita. Requiere permiso `billing:read`.
 */

import { adminDb } from '@/firebase/admin';
import { requirePlatformPermission } from '@/firebase/claims';
import { logPlatformAudit } from '@/lib/platform-audit';
import { sweepOverdueTenants } from '@/lib/billing-sweep';
import { addCycle, planPriceFor, type BillingCycle } from '@/lib/billing';
import type { TenantBilling, TenantPayment } from '@/lib/types';

/**
 * Registra un pago: avanza `paidThrough` un ciclo (desde hoy o desde la fecha
 * cubierta, la que sea mayor), marca "al día" y REACTIVA el tenant si estaba
 * suspendido. Deja constancia en `tenants/{id}/payments`.
 */
export async function recordPayment(input: {
  idToken: string;
  tenantId: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'billing:read');
    const ref = adminDb.collection('tenants').doc(input.tenantId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Tenant no encontrado.' };
    const t = snap.data() as { billing?: TenantBilling; status?: string };
    const billing = t.billing;
    if (!billing?.cycle) return { success: false, error: 'El tenant no tiene facturación configurada.' };

    const nowIso = new Date().toISOString();
    // Base: la fecha cubierta si aún es futura, o "ahora" si ya venció.
    const base = new Date(billing.paidThrough).getTime() > Date.now() ? billing.paidThrough : nowIso;
    const periodEnd = addCycle(base, billing.cycle);

    await ref.collection('payments').add({
      amount: billing.amount ?? 0,
      currency: billing.currency || 'COP',
      cycle: billing.cycle,
      periodStart: base,
      periodEnd,
      paidAt: nowIso,
      recordedByUid: caller.uid,
      ...(caller.email ? { recordedByEmail: caller.email } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    });

    const update: Record<string, unknown> = {
      'billing.paidThrough': periodEnd,
      'billing.status': 'al_dia',
      'billing.lastPaymentAt': nowIso,
    };
    // Un tenant suspendido por impago vuelve a activo al pagar.
    if (t.status === 'inactive') update.status = 'active';
    await ref.update(update);

    await logPlatformAudit(caller, 'tenant:payment', {
      tenantId: input.tenantId,
      amount: billing.amount ?? 0,
      periodEnd,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo registrar el pago.' };
  }
}

/**
 * Configura (o reconfigura) la facturación de un tenant que aún no la tiene
 * (p. ej. creado antes de este módulo). Toma el precio del plan para el ciclo
 * elegido y ancla la cobertura a HOY + un ciclo (nace "al día").
 */
export async function configureBilling(input: {
  idToken: string;
  tenantId: string;
  cycle: BillingCycle;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'billing:read');
    const ref = adminDb.collection('tenants').doc(input.tenantId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Tenant no encontrado.' };
    const t = snap.data() as { plan?: string };

    const planSnap = t.plan ? await adminDb.collection('plans').doc(t.plan).get() : null;
    const plan = planSnap?.exists
      ? (planSnap.data() as { prices?: { monthly?: number; semiannual?: number; annual?: number }; currency?: string })
      : undefined;

    const nowIso = new Date().toISOString();
    const billing: TenantBilling = {
      cycle: input.cycle,
      amount: planPriceFor(plan?.prices, input.cycle),
      currency: (plan?.currency || 'COP').toUpperCase(),
      paidThrough: addCycle(nowIso, input.cycle),
      status: 'al_dia',
    };
    await ref.update({ billing });
    await logPlatformAudit(caller, 'tenant:billing_configure', { tenantId: input.tenantId, cycle: input.cycle });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo configurar la facturación.' };
  }
}

/** Suspende manualmente un tenant por impago: status inactive + billing vencido. */
export async function suspendTenantBilling(input: {
  idToken: string;
  tenantId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'billing:read');
    await adminDb
      .collection('tenants')
      .doc(input.tenantId)
      .update({ status: 'inactive', 'billing.status': 'vencido' });
    await logPlatformAudit(caller, 'tenant:billing_suspend', { tenantId: input.tenantId });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo suspender el tenant.' };
  }
}

/**
 * Barrido de vencidos: suspende (status inactive) los tenants activos cuya
 * cobertura ya expiró. Es la suspensión "automática por fecha" — se invoca al
 * abrir la página de cobros (y puede engancharse a un cron externo).
 */
export async function runBillingSweep(input: {
  idToken: string;
}): Promise<{ success: boolean; suspended: number; error?: string }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'billing:read');
    const suspended = await sweepOverdueTenants(caller.uid);
    return { success: true, suspended };
  } catch (e: any) {
    return { success: false, suspended: 0, error: e?.message || 'No se pudo ejecutar el barrido.' };
  }
}

/** Historial de pagos de un tenant (más recientes primero). */
export async function listPayments(input: {
  idToken: string;
  tenantId: string;
}): Promise<{ payments?: TenantPayment[]; error?: string }> {
  try {
    await requirePlatformPermission(input.idToken, 'billing:read');
    const snap = await adminDb
      .collection('tenants')
      .doc(input.tenantId)
      .collection('payments')
      .orderBy('paidAt', 'desc')
      .limit(100)
      .get();
    const payments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TenantPayment, 'id'>) }));
    return { payments };
  } catch (e: any) {
    return { error: e?.message || 'No se pudieron cargar los pagos.' };
  }
}
