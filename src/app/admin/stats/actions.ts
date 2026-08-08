'use server';

/**
 * Control Plane — métricas agregadas de la plataforma. Lee el registro de
 * tenants y (vía collectionGroup) todos los pagos, sumando ingresos y series
 * mensuales. Solo operadores de plataforma.
 */

import { adminDb } from '@/firebase/admin';
import { requirePlatformAdmin } from '@/firebase/claims';
import { isOverdue } from '@/lib/billing';
import type { TenantBilling } from '@/lib/types';

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function lastMonthKeys(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
  }
  return out;
}

const monthKey = (iso?: string) => (iso ? iso.slice(0, 7) : ''); // 'YYYY-MM'

export interface PlatformStats {
  currency: string;
  totals: {
    tenants: number; active: number; inactive: number; provisioning: number; failed: number;
    alDia: number; vencidos: number; sinFacturacion: number;
    revenueTotal: number; recurringActive: number; operators: number;
  };
  byStatus: { name: string; value: number }[];
  byBilling: { name: string; value: number }[];
  byPlan: { name: string; value: number }[];
  revenueByMonth: { label: string; ingresos: number }[];
  tenantsByMonth: { label: string; nuevos: number }[];
}

export async function getPlatformStats(input: { idToken: string }): Promise<{ stats?: PlatformStats; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);

    const [tenantsSnap, paymentsSnap, operatorsSnap] = await Promise.all([
      adminDb.collection('tenants').get(),
      adminDb.collectionGroup('payments').get(),
      adminDb.collection('platformUsers').get(),
    ]);

    const tenants = tenantsSnap.docs.map((d) => d.data() as {
      status?: string; plan?: string; createdAt?: string; billing?: TenantBilling;
    });
    const payments = paymentsSnap.docs.map((d) => d.data() as { amount?: number; paidAt?: string; currency?: string });

    const currency = tenants.find((t) => t.billing?.currency)?.billing?.currency || 'COP';

    const totals = {
      tenants: tenants.length,
      active: tenants.filter((t) => t.status === 'active').length,
      inactive: tenants.filter((t) => t.status === 'inactive').length,
      provisioning: tenants.filter((t) => t.status === 'provisioning').length,
      failed: tenants.filter((t) => t.status === 'failed').length,
      alDia: tenants.filter((t) => t.billing && !isOverdue(t.billing.paidThrough)).length,
      vencidos: tenants.filter((t) => t.billing && isOverdue(t.billing.paidThrough)).length,
      sinFacturacion: tenants.filter((t) => !t.billing).length,
      revenueTotal: payments.reduce((s, p) => s + (p.amount || 0), 0),
      recurringActive: tenants
        .filter((t) => t.status === 'active' && t.billing)
        .reduce((s, t) => s + (t.billing?.amount || 0), 0),
      operators: operatorsSnap.size,
    };

    const byStatus = [
      { name: 'Activos', value: totals.active },
      { name: 'Inactivos', value: totals.inactive },
      { name: 'Aprovisionando', value: totals.provisioning },
      { name: 'Fallidos', value: totals.failed },
    ].filter((s) => s.value > 0);

    const byBilling = [
      { name: 'Al día', value: totals.alDia },
      { name: 'Vencidos', value: totals.vencidos },
      { name: 'Sin facturación', value: totals.sinFacturacion },
    ].filter((s) => s.value > 0);

    const planMap = new Map<string, number>();
    tenants.forEach((t) => planMap.set(t.plan || '—', (planMap.get(t.plan || '—') || 0) + 1));
    const byPlan = [...planMap.entries()].map(([name, value]) => ({ name, value }));

    const months = lastMonthKeys(12);
    const revByKey = new Map<string, number>();
    payments.forEach((p) => {
      const k = monthKey(p.paidAt);
      if (k) revByKey.set(k, (revByKey.get(k) || 0) + (p.amount || 0));
    });
    const tenByKey = new Map<string, number>();
    tenants.forEach((t) => {
      const k = monthKey(t.createdAt);
      if (k) tenByKey.set(k, (tenByKey.get(k) || 0) + 1);
    });
    const revenueByMonth = months.map((m) => ({ label: m.label, ingresos: revByKey.get(m.key) || 0 }));
    const tenantsByMonth = months.map((m) => ({ label: m.label, nuevos: tenByKey.get(m.key) || 0 }));

    return { stats: { currency, totals, byStatus, byBilling, byPlan, revenueByMonth, tenantsByMonth } };
  } catch (e: any) {
    return { error: e?.message || 'No se pudieron cargar las estadísticas.' };
  }
}
