/**
 * Barrido de morosos (compartido por la Server Action y el endpoint de cron).
 * Suspende (status inactive + billing vencido) los tenants ACTIVOS cuya
 * cobertura ya expiró. Nunca lanza por el log; devuelve cuántos suspendió.
 */

import { adminDb } from '@/firebase/admin';
import { logPlatformAudit } from '@/lib/platform-audit';
import type { TenantBilling } from '@/lib/types';

export async function sweepOverdueTenants(actorUid = 'system:cron'): Promise<number> {
  const now = Date.now();
  const snap = await adminDb.collection('tenants').get();
  const batch = adminDb.batch();
  let suspended = 0;
  snap.docs.forEach((d) => {
    const t = d.data() as { billing?: TenantBilling; status?: string };
    if (
      t.status === 'active' &&
      t.billing?.paidThrough &&
      new Date(t.billing.paidThrough).getTime() < now
    ) {
      batch.update(d.ref, { status: 'inactive', 'billing.status': 'vencido' });
      suspended++;
    }
  });
  if (suspended > 0) {
    await batch.commit();
    await logPlatformAudit({ uid: actorUid }, 'tenant:billing_sweep', { suspended });
  }
  return suspended;
}
