'use client';

import * as React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Loader2, Building2, CheckCircle2, AlertTriangle, Wallet, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPlatformStats, type PlatformStats } from './actions';

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = { 'Activos': '#22c55e', 'Inactivos': '#f59e0b', 'Aprovisionando': '#6366f1', 'Fallidos': '#ef4444' };
const BILLING_COLORS: Record<string, string> = { 'Al día': '#22c55e', 'Vencidos': '#ef4444', 'Sin facturación': '#94a3b8' };

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent><div className="h-64 w-full">{children}</div></CardContent>
    </Card>
  );
}

export default function PlatformStatsPage() {
  const auth = useAuth();
  const [stats, setStats] = React.useState<PlatformStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [clientN, setClientN] = React.useState('5');

  React.useEffect(() => {
    (async () => {
      try {
        const t = await auth.currentUser?.getIdToken();
        if (!t) return;
        const res = await getPlatformStats({ idToken: t });
        if (res.stats) setStats(res.stats);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth]);

  const money = React.useCallback(
    (n: number) => {
      try {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: stats?.currency || 'COP', maximumFractionDigits: 0 }).format(n);
      } catch {
        return `${n}`;
      }
    },
    [stats?.currency]
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!stats) return <p className="text-muted-foreground">No se pudieron cargar las estadísticas.</p>;

  const t = stats.totals;
  const cards = [
    { label: 'Tenants totales', value: String(t.tenants), icon: Building2, color: 'text-indigo-500' },
    { label: 'Activos', value: String(t.active), icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Clientes al día', value: String(t.alDia), icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Pendientes de pago', value: String(t.vencidos), icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Ingresos totales', value: money(t.revenueTotal), icon: Wallet, color: 'text-cyan-500' },
    { label: 'Recurrente (activos)', value: money(t.recurringActive), icon: TrendingUp, color: 'text-violet-500' },
    { label: 'Operadores', value: String(t.operators), icon: Users, color: 'text-amber-500' },
  ];

  // Serie acumulada por cliente (top N), para el gráfico de líneas.
  const topClients = stats.clients.slice(0, clientN === 'all' ? stats.clients.length : Number(clientN));
  const clientChartData = stats.revenueByMonth.map((m, idx) => {
    const row: Record<string, number | string> = { label: m.label };
    topClients.forEach((c) => { row[c.name] = c.monthly.slice(0, idx + 1).reduce((s, v) => s + v, 0); });
    return row;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground">Resumen de la plataforma: tenants, cobros e ingresos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent><div className="truncate text-2xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <ChartCard title="Ingresos por mes" description="Pagos registrados en los últimos 12 meses.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => money(Number(v))} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
            <Area type="monotone" dataKey="ingresos" stroke="#6366f1" strokeWidth={2} fill="url(#gradIngresos)" animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {stats.clients.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Pagos por cliente</CardTitle>
              <CardDescription>Acumulado de pagos por cliente en los últimos 12 meses.</CardDescription>
            </div>
            <Select value={clientN} onValueChange={setClientN}>
              <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Top 3 clientes</SelectItem>
                <SelectItem value="5">Top 5 clientes</SelectItem>
                <SelectItem value="10">Top 10 clientes</SelectItem>
                <SelectItem value="all">Todos ({stats.clients.length})</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => money(Number(v))} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {topClients.map((c, i) => (
                    <Line key={c.id} type="monotone" dataKey={c.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} animationDuration={900} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tenants por estado">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} animationDuration={900}>
                {stats.byStatus.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Estado de cobro">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.byBilling} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} animationDuration={900}>
                {stats.byBilling.map((e) => <Cell key={e.name} fill={BILLING_COLORS[e.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tenants por plan">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byPlan} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
              <Bar dataKey="value" name="Tenants" radius={[6, 6, 0, 0]} animationDuration={900}>
                {stats.byPlan.map((e, i) => <Cell key={e.name} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tenants nuevos por mes">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.tenantsByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
              <Bar dataKey="nuevos" name="Nuevos" fill="#06b6d4" radius={[6, 6, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
