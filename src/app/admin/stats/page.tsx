'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, Building2, CheckCircle2, PauseCircle, Users } from 'lucide-react';
import { useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import type { Tenant, PlatformUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Aggregate platform stats. NOTE: cross-tenant business metrics (voters,
 * campaigns, etc.) cannot be queried across databases — those require rollups
 * maintained in `(default)` (platformStats) per the runbook. This page shows
 * the metrics available directly from the Control Plane registry.
 */
export default function PlatformStatsPage() {
  const defaultDb = useDefaultDb();
  const tenantsRef = useMemoFirebase(() => collection(defaultDb, 'tenants'), [defaultDb]);
  const usersRef = useMemoFirebase(() => collection(defaultDb, 'platformUsers'), [defaultDb]);
  const { data: tenants, isLoading } = useCollection<Tenant>(tenantsRef);
  const { data: operators } = useCollection<PlatformUser>(usersRef);

  const stats = React.useMemo(() => {
    const list = tenants || [];
    return {
      total: list.length,
      active: list.filter((t) => t.status === 'active').length,
      inactive: list.filter((t) => t.status === 'inactive').length,
      provisioning: list.filter((t) => t.status === 'provisioning').length,
      failed: list.filter((t) => t.status === 'failed').length,
      operators: (operators || []).length,
    };
  }, [tenants, operators]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const cards = [
    { label: 'Tenants totales', value: stats.total, icon: Building2 },
    { label: 'Activos', value: stats.active, icon: CheckCircle2 },
    { label: 'Inactivos', value: stats.inactive, icon: PauseCircle },
    { label: 'Operadores', value: stats.operators, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground">Resumen de la plataforma.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>
      {(stats.provisioning > 0 || stats.failed > 0) && (
        <p className="text-sm text-muted-foreground">
          En curso: {stats.provisioning} aprovisionando · {stats.failed} fallidos.
        </p>
      )}
    </div>
  );
}
