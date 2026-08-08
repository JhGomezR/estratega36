'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, LogIn, Power, PowerOff, Palette, Trash2, Package } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { setImpersonation } from '@/firebase/tenant-db';
import type { Tenant, Plan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { provisionTenant, setTenantStatus, updateTenantBranding, deleteTenant, changeTenantPlan } from './actions';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  provisioning: 'secondary',
  inactive: 'outline',
  failed: 'destructive',
};

// `us-central1` es la región de la base de producción: los tenants nuevos deben
// nacer ahí para no quedar en otra región (la ubicación es INMUTABLE una vez
// creada la base).
const DEFAULT_LOCATION_ID = 'us-central1';

const EMPTY_CREATE = {
  displayName: '', companyName: '', plan: 'estratega', billingCycle: 'monthly',
  locationId: DEFAULT_LOCATION_ID, adminEmail: '', adminPassword: '', adminFullName: '',
};

export default function TenantsPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  const tenantsRef = useMemoFirebase(() => collection(defaultDb, 'tenants'), [defaultDb]);
  const { data: tenants, isLoading } = useCollection<Tenant>(tenantsRef);

  const plansRef = useMemoFirebase(() => collection(defaultDb, 'plans'), [defaultDb]);
  const { data: plans } = useCollection<Plan>(plansRef);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({ ...EMPTY_CREATE });
  const [submitting, setSubmitting] = React.useState(false);

  const [brandingTenant, setBrandingTenant] = React.useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Tenant | null>(null);
  const [confirmText, setConfirmText] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const [planTarget, setPlanTarget] = React.useState<Tenant | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState('');
  const [changingPlan, setChangingPlan] = React.useState(false);

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await provisionTenant({ idToken: await idToken(), ...form, plan: form.plan as any, billingCycle: form.billingCycle as any });
      if (res.success) {
        toast({ title: 'Tenant creado', description: `Aprovisionado "${res.tenantId}".` });
        setCreateOpen(false);
        setForm({ ...EMPTY_CREATE });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (t: Tenant) => {
    const next = t.status === 'active' ? 'inactive' : 'active';
    const res = await setTenantStatus({ idToken: await idToken(), tenantId: t.id, status: next });
    if (res.success) toast({ title: `Tenant ${next === 'active' ? 'activado' : 'desactivado'}` });
    else toast({ variant: 'destructive', title: 'Error', description: res.error });
  };

  const enterTenant = (t: Tenant) => {
    if (t.status !== 'active') {
      toast({ variant: 'destructive', title: 'Tenant no activo', description: 'Solo puedes entrar a tenants activos.' });
      return;
    }
    // Guardamos tenantId + databaseId: el primero viaja a los Server Actions
    // (que resuelven la base desde el registro), el segundo abre la conexión
    // cliente. El nombre es solo para el banner de impersonación.
    setImpersonation({
      tenantId: t.id,
      databaseId: t.databaseId,
      displayName: t.displayName || t.companyName || t.id,
    });
    // Recarga dura: el provider resuelve la conexión una vez por sesión.
    window.location.assign('/');
  };

  const confirmName = deleteTarget
    ? (deleteTarget.displayName || deleteTarget.companyName || deleteTarget.id)
    : '';

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteTenant({ idToken: await idToken(), tenantId: deleteTarget.id });
      if (res.success) {
        toast({ title: 'Tenant eliminado', description: `Se borró "${deleteTarget.id}" y su base de datos.` });
        setDeleteTarget(null);
        setConfirmText('');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const openPlan = (t: Tenant) => { setPlanTarget(t); setSelectedPlan(t.plan || ''); };

  const handleChangePlan = async () => {
    if (!planTarget || !selectedPlan) return;
    setChangingPlan(true);
    try {
      const res = await changeTenantPlan({ idToken: await idToken(), tenantId: planTarget.id, plan: selectedPlan });
      if (res.success) {
        toast({ title: 'Plan actualizado', description: 'Los módulos del tenant se ajustaron al plan.' });
        setPlanTarget(null);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setChangingPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Gestiona las organizaciones de la plataforma.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizaciones</CardTitle>
          <CardDescription>Cada tenant tiene su propia base de datos aislada.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Base de datos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tenants || []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.displayName || t.companyName || t.id}</TableCell>
                    <TableCell className="capitalize">{t.plan}</TableCell>
                    <TableCell className="font-mono text-xs">{t.databaseId}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status] || 'outline'} className="capitalize">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="Cambiar plan" onClick={() => openPlan(t)}>
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Branding" onClick={() => setBrandingTenant(t)}>
                        <Palette className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={t.status === 'active' ? 'Desactivar' : 'Activar'} onClick={() => toggleStatus(t)} disabled={t.status === 'provisioning'}>
                        {t.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Entrar al tenant" onClick={() => enterTenant(t)} disabled={t.status !== 'active'}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar tenant"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setDeleteTarget(t); setConfirmText(''); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!tenants || tenants.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aún no hay tenants.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create tenant */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear tenant</DialogTitle>
            <DialogDescription>Se creará una base de datos dedicada y un usuario administrador. Puede tardar unos minutos.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nombre visible</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Empresa</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="estratega">Estratega</SelectItem>
                  <SelectItem value="360">360</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ciclo de facturación</Label>
              <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ubicación Firestore</Label>
              <Input value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} placeholder={DEFAULT_LOCATION_ID} />
            </div>
            <div className="space-y-1">
              <Label>Admin: nombre completo</Label>
              <Input value={form.adminFullName} onChange={(e) => setForm({ ...form, adminFullName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Admin: email</Label>
              <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Admin: contraseña inicial</Label>
              <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branding */}
      <BrandingDialog
        tenant={brandingTenant}
        onClose={() => setBrandingTenant(null)}
        getIdToken={idToken}
      />

      {/* Cambiar plan */}
      <Dialog open={!!planTarget} onOpenChange={(o) => { if (!o) setPlanTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan — {planTarget?.displayName}</DialogTitle>
            <DialogDescription>Los módulos habilitados del tenant se ajustarán al plan seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue placeholder="Selecciona un plan" /></SelectTrigger>
              <SelectContent>
                {(plans || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(!plans || plans.length === 0) && (
              <p className="text-xs text-muted-foreground">No hay planes. Créalos primero en «Planes».</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanTarget(null)} disabled={changingPlan}>Cancelar</Button>
            <Button onClick={handleChangePlan} disabled={changingPlan || !selectedPlan}>
              {changingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar tenant (DESTRUCTIVO) */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setConfirmText(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar tenant</DialogTitle>
            <DialogDescription>
              Acción <strong>IRREVERSIBLE</strong>. Se borrará la base de datos{' '}
              <span className="font-mono">{deleteTarget?.databaseId}</span> con TODOS sus datos
              (votantes, campañas, usuarios…), el usuario administrador y el registro del tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Escribe <span className="font-semibold">{confirmName}</span> para confirmar
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmName}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setConfirmText(''); }} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || confirmText !== confirmName}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandingDialog({
  tenant, onClose, getIdToken,
}: { tenant: Tenant | null; onClose: () => void; getIdToken: () => Promise<string> }) {
  const { toast } = useToast();
  // La imagen de login NO es por tenant: es global (se edita en /admin/branding).
  // Aqui solo el logo interno del tenant y su color de marca.
  const [b, setB] = React.useState({ logoUrl: '', primaryColor: '' });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (tenant) {
      setB({
        logoUrl: tenant.branding?.logoUrl || '',
        primaryColor: tenant.branding?.primaryColor || '',
      });
    }
  }, [tenant]);

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const res = await updateTenantBranding({ idToken: await getIdToken(), tenantId: tenant.id, branding: b });
      if (res.success) { toast({ title: 'Branding actualizado' }); onClose(); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Branding — {tenant?.displayName}</DialogTitle>
          <DialogDescription>Logo interno y color de marca del tenant. La imagen del login es global y se edita en «Marca del login».</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Logo URL</Label><Input value={b.logoUrl} onChange={(e) => setB({ ...b, logoUrl: e.target.value })} /></div>
          <div className="space-y-1"><Label>Color primario</Label><Input value={b.primaryColor} onChange={(e) => setB({ ...b, primaryColor: e.target.value })} placeholder="#1d4ed8" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
