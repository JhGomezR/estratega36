/**
 * Utilidades de facturación (puras, usables en cliente y servidor).
 *
 * El ciclo de un tenant está anclado a su `createdAt`. `paidThrough` es la fecha
 * (ISO) hasta la que está cubierto: si ya pasó, el tenant está VENCIDO.
 */

export type BillingCycle = 'monthly' | 'semiannual' | 'annual';

export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  semiannual: 6,
  annual: 12,
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: 'Mensual',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export const BILLING_CYCLES: BillingCycle[] = ['monthly', 'semiannual', 'annual'];

/** Suma un ciclo a una fecha ISO y devuelve la nueva fecha ISO. */
export function addCycle(iso: string, cycle: BillingCycle): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + CYCLE_MONTHS[cycle]);
  return d.toISOString();
}

/** true si `paidThrough` ya pasó (tenant vencido). Ausente = vencido. */
export function isOverdue(paidThrough?: string | null, now: number = Date.now()): boolean {
  if (!paidThrough) return true;
  return new Date(paidThrough).getTime() < now;
}

/** Días que faltan (o negativos si ya venció) hasta `paidThrough`. */
export function daysUntilDue(paidThrough?: string | null, now: number = Date.now()): number | null {
  if (!paidThrough) return null;
  return Math.ceil((new Date(paidThrough).getTime() - now) / (1000 * 60 * 60 * 24));
}

/** Precio del plan para un ciclo dado (0 si no está definido). */
export function planPriceFor(
  prices: { monthly?: number; semiannual?: number; annual?: number } | undefined,
  cycle: BillingCycle
): number {
  if (!prices) return 0;
  return prices[cycle] ?? 0;
}
