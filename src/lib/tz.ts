/**
 * Formateo de fechas en la zona horaria del aplicativo (América/Bogotá).
 *
 * Las fechas se GUARDAN en UTC (ISO 8601, estándar); aquí se muestran e indexan
 * por mes en la zona de la app, para evitar el corrimiento de ±1 día/mes que
 * produce mostrar UTC en local.
 */

export const APP_TZ = 'America/Bogota';

/** dd/mm/aaaa en la zona de la app. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { timeZone: APP_TZ });
}

/** dd/mm/aaaa hh:mm en la zona de la app. */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { timeZone: APP_TZ });
}

/** Clave de mes 'YYYY-MM' en la zona de la app (para agrupar en gráficos). */
export function monthKeyTZ(iso?: string | null): string {
  if (!iso) return '';
  // en-CA formatea como YYYY-MM-DD; tomamos YYYY-MM.
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit' })
    .format(new Date(iso))
    .slice(0, 7);
}

/** Año y mes (1-12) ACTUALES en la zona de la app. */
export function nowYearMonthTZ(): { year: number; month: number } {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit' })
    .format(new Date())
    .split('-')
    .map(Number);
  return { year: y, month: m };
}
