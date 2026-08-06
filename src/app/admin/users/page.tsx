'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Power, PowerOff } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import type { PlatformUser, PlatformRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedSearch } from '@/hooks/use-paged-search';
import { TableSearch, TablePagination } from '@/components/table-tools';
import { useToast } from '@/hooks/use-toast';
import { createPlatformUser, setPlatformUserStatus } from './actions';

const EMPTY = { firstName: '', lastName: '', email: '', password: '', roleId: '' };

export default function PlatformUsersPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  const usersRef = useMemoFirebase(() => collection(defaultDb, 'platformUsers'), [defaultDb]);
  const rolesRef = useMemoFirebase(() => collection(defaultDb, 'platformRoles'), [defaultDb]);
  const { data: users, isLoading } = useCollection<PlatformUser>(usersRef);
  const { data: roles } = useCollection<PlatformRole>(rolesRef);

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [submitting, setSubmitting] = React.useState(false);

  const usersPaged = usePagedSearch(
    users ?? [],
    (u) => `${u.firstName} ${u.lastName} ${u.email} ${roles?.find((r) => r.id === u.roleId)?.name || u.roleId}`,
    10
  );

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const create = async () => {
    setSubmitting(true);
    try {
      const res = await createPlatformUser({ idToken: await idToken(), ...form });
      if (res.success) { toast({ title: 'Usuario de plataforma creado' }); setOpen(false); setForm({ ...EMPTY }); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSubmitting(false); }
  };

  const toggle = async (u: PlatformUser) => {
    const status = u.status === 'activo' ? 'inactivo' : 'activo';
    const res = await setPlatformUserStatus({ idToken: await idToken(), uid: u.id, status });
    if (res.success) toast({ title: 'Estado actualizado' });
    else toast({ variant: 'destructive', title: 'Error', description: res.error });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios de plataforma</h1>
          <p className="text-muted-foreground">Operadores con acceso al Control Plane.</p>
        </div>
        <Button onClick={() => setOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo operador</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Operadores</CardTitle><CardDescription>Tienen acceso total a la plataforma y a todos los tenants.</CardDescription></div>
          <TableSearch value={usersPaged.query} onChange={usersPaged.setQuery} placeholder="Buscar operador…" />
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {usersPaged.pageItems.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roles?.find((r) => r.id === u.roleId)?.name || u.roleId}</TableCell>
                    <TableCell><Badge variant={u.status === 'activo' ? 'default' : 'outline'}>{u.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => toggle(u)} title={u.status === 'activo' ? 'Desactivar' : 'Activar'}>
                        {u.status === 'activo' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {usersPaged.total === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{usersPaged.query ? 'No se encontraron operadores.' : 'Sin operadores.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!isLoading && usersPaged.total > 0 && (
          <CardFooter className="block"><TablePagination paged={usersPaged} noun="operadores" /></CardFooter>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo operador</DialogTitle><DialogDescription>Tendrá acceso completo al Control Plane.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Nombre</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div className="space-y-1"><Label>Apellido</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Contraseña inicial</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1 col-span-2">
              <Label>Rol de plataforma</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                <SelectContent>{(roles || []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={create} disabled={submitting || !form.roleId}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
