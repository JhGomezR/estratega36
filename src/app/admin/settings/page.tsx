'use client';

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getBillingConfig, saveBillingConfig, type BillingConfig } from './actions';

const CRONTAB: Record<BillingConfig['frequency'], string> = {
  daily: '0 3 * * *',
  weekly: '0 3 * * 1',
  monthly: '0 3 1 * *',
};
const FREQ_LABEL: Record<BillingConfig['frequency'], string> = {
  daily: 'Diaria (3:00)',
  weekly: 'Semanal (lunes 3:00)',
  monthly: 'Mensual (día 1, 3:00)',
};

export default function SettingsPage() {
  const auth = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = React.useState<BillingConfig | null>(null);
  const [daysText, setDaysText] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [origin, setOrigin] = React.useState('');

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  React.useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      try {
        const res = await getBillingConfig({ idToken: await idToken() });
        if (res.config) {
          setConfig(res.config);
          setDaysText(res.config.notifyDaysBefore.join(', '));
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const notifyDaysBefore = daysText.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n >= 0);
      const res = await saveBillingConfig({ idToken: await idToken(), config: { ...config, notifyDaysBefore } });
      if (res.success) { toast({ title: 'Configuración guardada' }); setConfig({ ...config, notifyDaysBefore }); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!config) return <p className="text-muted-foreground">No se pudo cargar la configuración.</p>;

  const cronUrl = `${origin}/api/cron/billing?key=TU_CRON_SECRET`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Automatización de cobros y tareas programadas de la plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturación automática</CardTitle>
          <CardDescription>Suspensión de morosos y periodos de aviso antes del vencimiento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Suspensión automática por impago</Label>
              <p className="text-xs text-muted-foreground">El barrido pasa a inactivo los tenants vencidos.</p>
            </div>
            <Switch checked={config.sweepEnabled} onCheckedChange={(v) => setConfig({ ...config, sweepEnabled: v })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Frecuencia del cron</Label>
              <Select value={config.frequency} onValueChange={(v) => setConfig({ ...config, frequency: v as BillingConfig['frequency'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{FREQ_LABEL.daily}</SelectItem>
                  <SelectItem value="weekly">{FREQ_LABEL.weekly}</SelectItem>
                  <SelectItem value="monthly">{FREQ_LABEL.monthly}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Frecuencia sugerida (la marca el cron externo).</p>
            </div>
            <div className="space-y-1">
              <Label>Avisar días antes del vencimiento</Label>
              <Input value={daysText} onChange={(e) => setDaysText(e.target.value)} placeholder="15, 7, 3" />
              <p className="text-xs text-muted-foreground">Periodos de notificación, separados por coma.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarea programada (cron)</CardTitle>
          <CardDescription>El barrido corre desatendido llamando a este endpoint desde un cron externo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="mb-1 font-medium">1) Define un secreto en el servidor</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">CRON_SECRET=una-clave-larga-y-secreta</pre>
          </div>
          <div>
            <p className="mb-1 font-medium">2) Endpoint a llamar</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{cronUrl}</pre>
          </div>
          <div>
            <p className="mb-1 font-medium">3) Línea de crontab ({FREQ_LABEL[config.frequency]})</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{`${CRONTAB[config.frequency]} curl -fsS "${origin}/api/cron/billing?key=$CRON_SECRET" >/dev/null`}</pre>
          </div>
          <p className="text-xs text-muted-foreground">También puedes usar un servicio como cron-job.org apuntando al endpoint con el secreto.</p>
        </CardContent>
      </Card>
    </div>
  );
}
