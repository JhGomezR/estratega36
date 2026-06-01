'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { type PlatformRole, availablePlatformPermissions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { upsertPlatformRole, deletePlatformRole } from './actions';

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

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const openNew = () => { setEditing(null); setName(''); setPerms([]); setOpen(true); };
  const openEdit = (r: PlatformRole) => { setEditing(r); setName(r.name); setPerms(r.permissions || []); setOpen(true); };

  const togglePerm = (p: string) =>
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

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
        <CardHeader><CardTitle>Roles</CardTitle><CardDescription>Definen qué puede hacer cada operador.</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Permisos</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {(roles || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="secondary">{r.permissions?.length || 0} permisos</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!roles || roles.length === 0) && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin roles.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar rol' : 'Nuevo rol'}</DialogTitle><DialogDescription>Selecciona los permisos de plataforma.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Permisos</Label>
              <div className="grid grid-cols-2 gap-2">
                {availablePlatformPermissions.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={perms.includes(p)} onCheckedChange={() => togglePerm(p)} />
                    <span className="font-mono text-xs">{p}</span>
                  </label>
                ))}
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
