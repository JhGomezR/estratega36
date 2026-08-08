'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Pencil, Trash2, Building2, Users, ShieldCheck, BarChart3, ScrollText, CircleDollarSign } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { type PlatformRole, platformPermissionGroups } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionMatrix } from '@/components/permission-matrix';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { usePagedSearch } from '@/hooks/use-paged-search';
import { TableSearch, TablePagination } from '@/components/table-tools';
import { useToast } from '@/hooks/use-toast';
import { upsertPlatformRole, deletePlatformRole } from './actions';

const PLATFORM_LABELS: Record<string, string> = {
  tenant: 'Tenants',
  platformUser: 'Usuarios de plataforma',
  platformRole: 'Roles de plataforma',
  stats: 'Estadísticas',
  audit: 'Auditoría',
  billing: 'Facturación',
};
const PLATFORM_ICONS = {
  tenant: Building2,
  platformUser: Users,
  platformRole: ShieldCheck,
  stats: BarChart3,
  audit: ScrollText,
  billing: CircleDollarSign,
};

export default function PlatformRolesPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  const rolesRef = useMemoFirebase(() => collection(defaultDb, 'platformRoles'), [defaultDb]);
  const { data: roles, isLoading } = useCollection<PlatformRole>(rolesRef);

  const [editing, setEditing] = React.useState<PlatformRole | null>(null);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [perms, setPerms] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const rolesPaged = usePagedSearch(roles ?? [], (r) => r.name, 10);

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const openNew = () => { setEditing(null); setName(''); setPerms([]); setOpen(true); };
  const openEdit = (r: PlatformRole) => { setEditing(r); setName(r.name); setPerms(r.permissions || []); setOpen(true); };

  const save = async () => {
    setSaving(true);
    try {
      const res = await upsertPlatformRole({
        idToken: await idToken(),
        roleId: editing?.id,
        name,
        permissions: perms,
        status: 'activo',
      });
      if (res.success) { toast({ title: 'Rol guardado' }); setOpen(false); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSaving(false); }
  };

  const remove = async (r: PlatformRole) => {
    const res = await deletePlatformRole({ idToken: await idToken(), roleId: r.id });
    if (res.success) toast({ title: 'Rol eliminado' });
    else toast({ variant: 'destructive', title: 'Error', description: res.error });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles de plataforma</h1>
          <p className="text-muted-foreground">Permisos para operadores del Control Plane.</p>
        </div>
        <Button onClick={openNew}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo rol</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Roles</CardTitle><CardDescription>Definen qué puede hacer cada operador.</CardDescription></div>
          <TableSearch value={rolesPaged.query} onChange={rolesPaged.setQuery} placeholder="Buscar rol…" />
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Permisos</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {rolesPaged.pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.permissions?.length || 0} permisos</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rolesPaged.total === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">{rolesPaged.query ? 'No se encontraron roles.' : 'Sin roles.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!isLoading && rolesPaged.total > 0 && (
          <CardFooter className="block"><TablePagination paged={rolesPaged} noun="roles" /></CardFooter>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[660px]">
          <DialogHeader><DialogTitle>{editing ? 'Editar rol' : 'Nuevo rol'}</DialogTitle><DialogDescription>Define el nombre y los permisos de plataforma por módulo.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Permisos de plataforma</Label>
              <PermissionMatrix
                groups={platformPermissionGroups}
                value={perms}
                onChange={setPerms}
                moduleLabels={PLATFORM_LABELS}
                moduleIcons={PLATFORM_ICONS}
              />
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
