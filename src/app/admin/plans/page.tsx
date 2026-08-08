'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Pencil, Trash2, PackagePlus } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { type Plan, APP_MODULES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { upsertPlan, deletePlan, seedDefaultPlans } from './actions';

const MODULE_LABEL: Record<string, string> = Object.fromEntries(APP_MODULES.map((m) => [m.key, m.label]));

/** Módulos agrupados por categoría (preservando el orden de APP_MODULES). */
const MODULE_GROUPS: { group: string; items: { key: string; label: string }[] }[] = (() => {
  const order: string[] = [];
  const byGroup: Record<string, { key: string; label: string }[]> = {};
  for (const m of APP_MODULES) {
    if (!byGroup[m.group]) { byGroup[m.group] = []; order.push(m.group); }
    byGroup[m.group].push({ key: m.key, label: m.label });
  }
  return order.map((group) => ({ group, items: byGroup[group] }));
})();

export default function PlansPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  const plansRef = useMemoFirebase(() => collection(defaultDb, 'plans'), [defaultDb]);
  const { data: plans, isLoading } = useCollection<Plan>(plansRef);

  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [modules, setModules] = React.useState<string[]>([]);
  const [maxUsers, setMaxUsers] = React.useState('');
  const [maxRoles, setMaxRoles] = React.useState('');
  const [maxCampaigns, setMaxCampaigns] = React.useState('');
  const [currency, setCurrency] = React.useState('COP');
  const [priceMonthly, setPriceMonthly] = React.useState('');
  const [priceSemiannual, setPriceSemiannual] = React.useState('');
  const [priceAnnual, setPriceAnnual] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const openNew = () => {
    setEditing(null); setName(''); setModules([]);
    setMaxUsers(''); setMaxRoles(''); setMaxCampaigns('');
    setCurrency('COP'); setPriceMonthly(''); setPriceSemiannual(''); setPriceAnnual('');
    setOpen(true);
  };
  const openEdit = (p: Plan) => {
    setEditing(p); setName(p.name); setModules(p.modules || []);
    setMaxUsers(p.maxUsers ? String(p.maxUsers) : '');
    setMaxRoles(p.maxRoles ? String(p.maxRoles) : '');
    setMaxCampaigns(p.maxCampaigns ? String(p.maxCampaigns) : '');
    setCurrency(p.currency || 'COP');
    setPriceMonthly(p.prices?.monthly ? String(p.prices.monthly) : '');
    setPriceSemiannual(p.prices?.semiannual ? String(p.prices.semiannual) : '');
    setPriceAnnual(p.prices?.annual ? String(p.prices.annual) : '');
    setOpen(true);
  };
  const toggle = (key: string) =>
    setModules((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  const toggleGroup = (keys: string[], on: boolean) =>
    setModules((prev) => (on ? [...new Set([...prev, ...keys])] : prev.filter((m) => !keys.includes(m))));

  const toLimit = (v: string) => (v.trim() === '' ? 0 : Math.max(0, parseInt(v, 10) || 0));

  const save = async () => {
    setSaving(true);
    try {
      const res = await upsertPlan({
        idToken: await idToken(),
        planId: editing?.id,
        name,
        modules,
        maxUsers: toLimit(maxUsers),
        maxRoles: toLimit(maxRoles),
        maxCampaigns: toLimit(maxCampaigns),
        currency: currency.trim() || 'COP',
        prices: {
          monthly: toLimit(priceMonthly),
          semiannual: toLimit(priceSemiannual),
          annual: toLimit(priceAnnual),
        },
        status: 'activo',
      });
      if (res.success) { toast({ title: 'Plan guardado' }); setOpen(false); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSaving(false); }
  };

  const remove = async (p: Plan) => {
    const res = await deletePlan({ idToken: await idToken(), planId: p.id });
    if (res.success) toast({ title: 'Plan eliminado' });
    else toast({ variant: 'destructive', title: 'Error', description: res.error });
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const res = await seedDefaultPlans({ idToken: await idToken() });
      if (res.success) toast({ title: 'Planes por defecto creados' });
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSeeding(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planes</h1>
          <p className="text-muted-foreground">Define qué módulos habilita cada plan para los tenants.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seed} disabled={seeding}>
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
            Crear por defecto
          </Button>
          <Button onClick={openNew}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo plan</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Planes</CardTitle><CardDescription>Los tenants heredan los módulos del plan asignado.</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Módulos</TableHead><TableHead>Límites</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {(plans || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name} <span className="font-mono text-xs text-muted-foreground">({p.id})</span></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(p.modules || []).map((m) => <Badge key={m} variant="secondary">{MODULE_LABEL[m] || m}</Badge>)}
                        {(!p.modules || p.modules.length === 0) && <span className="text-xs text-muted-foreground">Sin módulos</span>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {p.maxUsers ? p.maxUsers : '∞'} usuarios · {p.maxRoles ? p.maxRoles : '∞'} roles · {p.maxCampaigns ? p.maxCampaigns : '∞'} campañas
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!plans || plans.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin planes. Pulsa «Crear por defecto» para empezar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar plan' : 'Nuevo plan'}</DialogTitle><DialogDescription>Cada módulo es individual: actívalos para cobrar por módulo adicional.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Máx. usuarios</Label>
                <Input type="number" min={0} value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-1">
                <Label>Máx. roles</Label>
                <Input type="number" min={0} value={maxRoles} onChange={(e) => setMaxRoles(e.target.value)} placeholder="∞" />
              </div>
              <div className="space-y-1">
                <Label>Máx. campañas</Label>
                <Input type="number" min={0} value={maxCampaigns} onChange={(e) => setMaxCampaigns(e.target.value)} placeholder="∞" />
              </div>
              <p className="col-span-3 -mt-1 text-xs text-muted-foreground">Vacío o 0 = ilimitado.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Precios por ciclo</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Moneda</span>
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-8 w-20" maxLength={3} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mensual</Label>
                  <Input type="number" min={0} value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Semestral</Label>
                  <Input type="number" min={0} value={priceSemiannual} onChange={(e) => setPriceSemiannual(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Anual</Label>
                  <Input type="number" min={0} value={priceAnnual} onChange={(e) => setPriceAnnual(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Módulos habilitados</Label>
                <span className="text-xs text-muted-foreground">{modules.length}/{APP_MODULES.length} activos</span>
              </div>
              <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
                {MODULE_GROUPS.map(({ group, items }) => {
                  const keys = items.map((i) => i.key);
                  const allOn = keys.every((k) => modules.includes(k));
                  return (
                    <div key={group} className="space-y-2">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</span>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => toggleGroup(keys, !allOn)}
                        >
                          {allOn ? 'Quitar todo' : 'Todo'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((m) => (
                          <label key={m.key} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={modules.includes(m.key)} onCheckedChange={() => toggle(m.key)} />
                            <span>{m.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || name.length < 2}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
