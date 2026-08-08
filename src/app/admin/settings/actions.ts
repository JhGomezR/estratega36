'use server';

/**
 * Control Plane — configuración de la plataforma. Guarda ajustes globales en
 * `(default)/platformConfig/{doc}`. Solo operadores de plataforma. El acceso es
 * por Admin SDK (Server Actions), así que no requiere reglas de cliente.
 */

import { adminDb } from '@/firebase/admin';
import { requirePlatformAdmin } from '@/firebase/claims';
import { logPlatformAudit } from '@/lib/platform-audit';

export interface BillingConfig {
  /** Si el barrido/cron de morosos está habilitado. */
  sweepEnabled: boolean;
  /** Frecuencia SUGERIDA del cron externo (informativa, para el crontab). */
  frequency: 'daily' | 'weekly' | 'monthly';
  /** Días antes del vencimiento en los que avisar (periodos de notificación). */
  notifyDaysBefore: number[];
}

const DEFAULTS: BillingConfig = { sweepEnabled: true, frequency: 'weekly', notifyDaysBefore: [15, 7, 3] };

export async function getBillingConfig(input: { idToken: string }): Promise<{ config?: BillingConfig; error?: string }> {
  try {
    await requirePlatformAdmin(input.idToken);
    const snap = await adminDb.collection('platformConfig').doc('billing').get();
    const data = (snap.exists ? snap.data() : {}) as Partial<BillingConfig>;
    return {
      config: {
        sweepEnabled: data.sweepEnabled ?? DEFAULTS.sweepEnabled,
        frequency: data.frequency ?? DEFAULTS.frequency,
        notifyDaysBefore: Array.isArray(data.notifyDaysBefore) ? data.notifyDaysBefore : DEFAULTS.notifyDaysBefore,
      },
    };
  } catch (e: any) {
    return { error: e?.message || 'No se pudo cargar la configuración.' };
  }
}

export async function saveBillingConfig(input: { idToken: string; config: BillingConfig }): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformAdmin(input.idToken);
    const c = input.config;
    const clean: BillingConfig = {
      sweepEnabled: !!c.sweepEnabled,
      frequency: (['daily', 'weekly', 'monthly'].includes(c.frequency) ? c.frequency : 'weekly') as BillingConfig['frequency'],
      notifyDaysBefore: (Array.isArray(c.notifyDaysBefore) ? c.notifyDaysBefore : [])
        .filter((n) => Number.isFinite(n) && n >= 0)
        .sort((a, b) => b - a)
        .slice(0, 6),
    };
    await adminDb.collection('platformConfig').doc('billing').set(clean, { merge: true });
    await logPlatformAudit(caller, 'config:billing_update', clean);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo guardar la configuración.' };
  }
}
