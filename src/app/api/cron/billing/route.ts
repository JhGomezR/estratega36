/**
 * Endpoint de cron para la suspensión automática por impago. Un programador
 * EXTERNO (cron del VPS, cron-job.org, etc.) lo llama a la frecuencia deseada.
 * Protegido por el secreto `CRON_SECRET` (env). No usa sesión de usuario.
 *
 *   GET /api/cron/billing?key=<CRON_SECRET>
 *   GET /api/cron/billing        (Authorization: Bearer <CRON_SECRET>)
 */

import { sweepOverdueTenants } from '@/lib/billing-sweep';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: 'CRON_SECRET no está configurado en el servidor.' }, { status: 500 });
  }
  const url = new URL(req.url);
  const key = url.searchParams.get('key') || (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (key !== secret) {
    return Response.json({ ok: false, error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const suspended = await sweepOverdueTenants('system:cron');
    return Response.json({ ok: true, suspended });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || 'Error en el barrido.' }, { status: 500 });
  }
}
