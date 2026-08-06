'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, RefreshCw, ShieldAlert, Eye } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';
import { usePagedSearch } from '@/hooks/use-paged-search';
import { TableSearch, TablePagination } from '@/components/table-tools';
import type { Tenant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { listAuditLogs, type AuditLogRow } from './actions';

export default function LogsPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();
  const { hasPlatformPermission } = usePlatformPermissions();
  const canView = hasPlatformPermission('audit:read');

  const tenantsRef = useMemoFirebase(() => collection(defaultDb, 'tenants'), [defaultDb]);
  const { data: tenants } = useCollection<Tenant>(tenantsRef);

  const tenantName = React.useMemo(() => {
    const map: Record<string, string> = { platform: 'Plataforma' };
    (tenants || []).forEach((t) => { map[t.id] = t.displayName || t.id; });
    return map;
  }, [tenants]);

  const [scope, setScope] = React.useState('all');
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<AuditLogRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const t = await auth.currentUser?.getIdToken();
      if (!t) throw new Error('Sesión no disponible.');
      const res = await listAuditLogs({ idToken: t, scope, limit: 300 });
      if (res.error) { toast({ variant: 'destructive', title: 'Error', description: res.error }); setLogs([]); }
      else setLogs(res.logs || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [auth, scope, toast]);

  React.useEffect(() => { if (canView) load(); }, [canView, load]);

  const paged = usePagedSearch(
    logs,
    (l) => `${l.action} ${l.userEmail || ''} ${l.userId} ${tenantName[l.tenantId || ''] || l.tenantId || ''} ${l.ipAddress || ''}`,
    15
  );

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        <ShieldAlert className="h-10 w-10" />
        <p className="text-lg font-medium">No tienes acceso a la auditoría</p>
        <p className="text-sm">Tu rol de plataforma no incluye el permiso <code>audit:read</code>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoría</h1>
          <p className="text-muted-foreground">Registro de acciones de operadores de plataforma y de los tenants.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Eventos</CardTitle>
            <CardDescription>Selecciona el ámbito (plataforma o un tenant). Muestra los más recientes.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-9 w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los ámbitos</SelectItem>
                <SelectItem value="platform">Plataforma (Control Plane)</SelectItem>
                {(tenants || []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>Tenant: {t.displayName || t.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TableSearch value={paged.query} onChange={paged.setQuery} placeholder="Buscar acción, usuario, IP…" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Fecha</TableHead>
                    <TableHead className="min-w-[140px]">Ámbito</TableHead>
                    <TableHead className="min-w-[200px]">Usuario</TableHead>
                    <TableHead className="min-w-[160px]">Acción</TableHead>
                    <TableHead className="min-w-[120px]">IP</TableHead>
                    <TableHead className="text-right">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.total === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {paged.query ? 'No se encontraron eventos.' : 'Sin eventos registrados en este ámbito.'}
                    </TableCell></TableRow>
                  )}
                  {paged.pageItems.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-sm">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-sm">
                        {l.tenantId === 'platform'
                          ? <Badge variant="secondary">Plataforma</Badge>
                          : <Badge variant="outline">{tenantName[l.tenantId || ''] || l.tenantId || '—'}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{l.userEmail || <span className="font-mono text-xs text-muted-foreground">{l.userId}</span>}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-xs">{l.action}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.ipAddress || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDetail(l)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!loading && paged.total > 0 && (
          <CardFooter className="block"><TablePagination paged={paged} noun="eventos" /></CardFooter>
        )}
      </Card>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{detail?.action}</DialogTitle>
            <DialogDescription>
              {(detail?.tenantId === 'platform' ? 'Plataforma' : tenantName[detail?.tenantId || ''] || detail?.tenantId)} · {detail?.userEmail || detail?.userId} · {detail?.timestamp ? new Date(detail.timestamp).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {(detail?.ipAddress || detail?.geo?.city) && (
              <p className="text-muted-foreground">
                {detail?.ipAddress}{detail?.geo?.city ? ` · ${detail.geo.city}, ${detail.geo.country}` : ''}
              </p>
            )}
            {detail?.userAgent && <p className="break-words text-xs text-muted-foreground">{detail.userAgent}</p>}
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(detail?.details ?? {}, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
