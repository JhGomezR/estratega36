'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, ShieldAlert, RefreshCw, CircleDollarSign, Ban, Receipt } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';
import { usePagedSearch } from '@/hooks/use-paged-search';
import { TableSearch, TablePagination } from '@/components/table-tools';
import { isOverdue, daysUntilDue, CYCLE_LABEL } from '@/lib/billing';
import type { Tenant, TenantPayment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { recordPayment, suspendTenantBilling, runBillingSweep, listPayments } from './actions';

function money(amount?: number, currency = 'COP') {
  if (!amount) return '—';
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function BillingPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();
  const { hasPlatformPermission } = usePlatformPermissions();
  const canView = hasPlatformPermission('billing:read');

  const tenantsRef = useMemoFirebase(() => collection(defaultDb, 'tenants'), [defaultDb]);
  const { data: tenants, isLoading } = useCollection<Tenant>(tenantsRef);

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  // Suspensión automática por fecha: al abrir la página, barremos los vencidos.
  const [swept, setSwept] = React.useState(false);
  const sweep = React.useCallback(async () => {
    try {
      const res = await runBillingSweep({ idToken: await idToken() });
      if (res.success && res.suspended > 0) {
        toast({ title: 'Vencidos suspendidos', description: `${res.suspended} tenant(s) pasaron a inactivo por impago.` });
      }
    } catch { /* silencio */ }
  }, [toast]);
  React.useEffect(() => {
    if (canView && !swept) { setSwept(true); sweep(); }
  }, [canView, swept, sweep]);

  const rows = React.useMemo(
    () => [...(tenants || [])].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
    [tenants]
  );
  const paged = usePagedSearch(
    rows,
    (t) => `${t.displayName} ${t.plan} ${t.billing?.status || ''}`,
    12
  );

  const [payTarget, setPayTarget] = React.useState<Tenant | null>(null);
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [suspendTarget, setSuspendTarget] = React.useState<Tenant | null>(null);
  const [historyTarget, setHistoryTarget] = React.useState<Tenant | null>(null);
  const [history, setHistory] = React.useState<TenantPayment[] | null>(null);

  const doPay = async () => {
    if (!payTarget) return;
    setSaving(true);
    try {
      const res = await recordPayment({ idToken: await idToken(), tenantId: payTarget.id, notes: notes.trim() || undefined });
      if (res.success) { toast({ title: 'Pago registrado' }); setPayTarget(null); setNotes(''); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
    finally { setSaving(false); }
  };

  const doSuspend = async () => {
    if (!suspendTarget) return;
    const res = await suspendTenantBilling({ idToken: await idToken(), tenantId: suspendTarget.id });
    if (res.success) toast({ title: 'Tenant suspendido', description: 'Pasó a inactivo por impago.' });
    else toast({ variant: 'destructive', title: 'Error', description: res.error });
    setSuspendTarget(null);
  };

  const openHistory = async (t: Tenant) => {
    setHistoryTarget(t); setHistory(null);
    const res = await listPayments({ idToken: await idToken(), tenantId: t.id });
    setHistory(res.payments || []);
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        <ShieldAlert className="h-10 w-10" />
        <p className="text-lg font-medium">No tienes acceso a facturación</p>
        <p className="text-sm">Tu rol de plataforma no incluye el permiso <code>billing:read</code>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación y cobros</h1>
          <p className="text-muted-foreground">Estado de pago de cada tenant. Los vencidos se suspenden automáticamente.</p>
        </div>
        <Button variant="outline" onClick={sweep}><RefreshCw className="mr-2 h-4 w-4" /> Revisar vencidos</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><CardTitle>Tenants</CardTitle><CardDescription>Ciclo, monto, próximo vencimiento y estado de cobro.</CardDescription></div>
          <TableSearch value={paged.query} onChange={paged.setQuery} placeholder="Buscar tenant…" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Tenant</TableHead>
                    <TableHead>Plan / Ciclo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Cobro</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.total === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {paged.query ? 'No se encontraron tenants.' : 'Sin tenants.'}
                    </TableCell></TableRow>
                  )}
                  {paged.pageItems.map((t) => {
                    const b = t.billing;
                    const overdue = b ? isOverdue(b.paidThrough) : false;
                    const days = b ? daysUntilDue(b.paidThrough) : null;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.displayName}<div className="font-mono text-xs text-muted-foreground">{t.id}</div></TableCell>
                        <TableCell className="text-sm">{t.plan}{b ? <div className="text-xs text-muted-foreground">{CYCLE_LABEL[b.cycle]}</div> : null}</TableCell>
                        <TableCell className="text-sm">{b ? money(b.amount, b.currency) : '—'}</TableCell>
                        <TableCell className="text-sm">
                          {b?.paidThrough ? (
                            <span className={overdue ? 'font-medium text-destructive' : ''}>
                              {new Date(b.paidThrough).toLocaleDateString()}
                              {days !== null && <span className="ml-1 text-xs text-muted-foreground">({days < 0 ? `${-days}d vencido` : `en ${days}d`})</span>}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {!b ? <Badge variant="outline">Sin facturación</Badge>
                            : overdue ? <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Vencido</Badge>
                            : <Badge variant="secondary">Al día</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'active' ? 'secondary' : 'outline'}>{t.status === 'active' ? 'Activo' : t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" title="Registrar pago" onClick={() => { setPayTarget(t); setNotes(''); }} disabled={!b}><CircleDollarSign className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Historial de pagos" onClick={() => openHistory(t)}><Receipt className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Suspender por impago" onClick={() => setSuspendTarget(t)} disabled={t.status !== 'active'}><Ban className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && paged.total > 0 && (
          <CardFooter className="block"><TablePagination paged={paged} noun="tenants" /></CardFooter>
        )}
      </Card>

      {/* Registrar pago */}
      <Dialog open={payTarget !== null} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              {payTarget?.displayName} · {payTarget?.billing ? `${money(payTarget.billing.amount, payTarget.billing.currency)} / ${CYCLE_LABEL[payTarget.billing.cycle]}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Se registrará el pago del monto del plan y se extenderá la cobertura un ciclo. Si estaba suspendido, se reactivará.</p>
            <Label>Notas (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Referencia, método, comentario…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={doPay} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial */}
      <Dialog open={historyTarget !== null} onOpenChange={(o) => !o && setHistoryTarget(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Pagos de {historyTarget?.displayName}</DialogTitle>
            <DialogDescription>Historial de pagos registrados.</DialogDescription>
          </DialogHeader>
          {history === null ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Monto</TableHead><TableHead>Cubre hasta</TableHead><TableHead>Por</TableHead></TableRow></TableHeader>
                <TableBody>
                  {history.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{new Date(p.paidAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{money(p.amount, p.currency)}</TableCell>
                      <TableCell className="text-sm">{new Date(p.periodEnd).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.recordedByEmail || p.recordedByUid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspender */}
      <AlertDialog open={suspendTarget !== null} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Suspender a {suspendTarget?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              El tenant pasará a <strong>inactivo</strong> por impago y sus usuarios no podrán ingresar hasta registrar un pago. Podrás reactivarlo registrando el pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doSuspend}>Suspender</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
