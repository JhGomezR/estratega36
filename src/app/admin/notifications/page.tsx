'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { Loader2, PlusCircle, Pencil, Trash2, Bell, ImagePlus, X } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase } from '@/firebase';
import { type Notification, type Tenant } from '@/lib/types';
import { fileToCompressedDataUrl } from '@/lib/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { upsertNotification, deleteNotification } from './actions';

export default function NotificationsPage() {
  const auth = useAuth();
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  const notifsRef = useMemoFirebase(() => collection(defaultDb, 'notifications'), [defaultDb]);
  const { data: notifs, isLoading } = useCollection<Notification>(notifsRef);
  const tenantsRef = useMemoFirebase(() => collection(defaultDb, 'tenants'), [defaultDb]);
  const { data: tenants } = useCollection<Tenant>(tenantsRef);

  const tenantName = React.useMemo(() => {
    const map: Record<string, string> = {};
    (tenants || []).forEach((t) => { map[t.id] = t.displayName || t.id; });
    return map;
  }, [tenants]);

  const sorted = React.useMemo(
    () => [...(notifs || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [notifs]
  );

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Notification | null>(null);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [audience, setAudience] = React.useState<'all' | 'tenant'>('all');
  const [tenantId, setTenantId] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Notification | null>(null);

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const openNew = () => {
    setEditing(null); setTitle(''); setBody(''); setImageUrl('');
    setAudience('all'); setTenantId(''); setActive(true); setOpen(true);
  };
  const openEdit = (n: Notification) => {
    setEditing(n); setTitle(n.title); setBody(n.body); setImageUrl(n.imageUrl || '');
    setAudience(n.audience); setTenantId(n.tenantId || ''); setActive(n.status !== 'inactivo'); setOpen(true);
  };

  const onImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await fileToCompressedDataUrl(file));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Imagen no válida', description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await upsertNotification({
        idToken: await idToken(),
        id: editing?.id,
        title, body,
        imageUrl: imageUrl || undefined,
        audience,
        tenantId: audience === 'tenant' ? tenantId : undefined,
        status: active ? 'activo' : 'inactivo',
      });
      if (res.success) { toast({ title: 'Notificación guardada' }); setOpen(false); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!toDelete) return;
    const res = await deleteNotification({ idToken: await idToken(), id: toDelete.id });
    if (res.success) toast({ title: 'Notificación eliminada', description: 'Se quitó para todos los tenants.' });
    else toast({ variant: 'destructive', title: 'Error', description: res.error });
    setToDelete(null);
  };

  const canSave = title.trim().length >= 2 && body.trim().length >= 1 && (audience === 'all' || tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground">Emite avisos a todos los tenants o a uno específico. Los tenants solo pueden leerlos.</p>
        </div>
        <Button onClick={openNew}><PlusCircle className="mr-2 h-4 w-4" /> Nueva notificación</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones del sistema</CardTitle>
          <CardDescription>Editar o eliminar aquí se refleja de inmediato en todos los tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]">Imagen</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      {n.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground"><Bell className="h-4 w-4" /></div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell>
                      {n.audience === 'all'
                        ? <Badge variant="secondary">Todos los tenants</Badge>
                        : <Badge variant="outline">{tenantName[n.tenantId || ''] || n.tenantId}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={n.status === 'inactivo' ? 'outline' : 'secondary'}>
                        {n.status === 'inactivo' ? 'Inactiva' : 'Activa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setToDelete(n)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Aún no hay notificaciones.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Crear / editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar notificación' : 'Nueva notificación'}</DialogTitle>
            <DialogDescription>Texto y, opcionalmente, una imagen. Elige a quién va dirigida.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mantenimiento programado" />
            </div>

            <div className="space-y-1">
              <Label>Mensaje</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Escribe el contenido de la notificación…" />
            </div>

            <div className="space-y-1">
              <Label>Imagen (opcional)</Label>
              {imageUrl ? (
                <div className="relative w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Vista previa" className="max-h-40 rounded border object-contain" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-muted">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? 'Procesando…' : 'Subir imagen'}
                  <input type="file" accept="image/*" className="hidden" onChange={onImageSelect} disabled={uploading} />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Destinatario</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as 'all' | 'tenant')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tenants</SelectItem>
                    <SelectItem value="tenant">Un tenant específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {audience === 'tenant' && (
                <div className="space-y-1">
                  <Label>Tenant</Label>
                  <Select value={tenantId} onValueChange={setTenantId}>
                    <SelectTrigger><SelectValue placeholder="Elegir tenant…" /></SelectTrigger>
                    <SelectContent>
                      {(tenants || []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.displayName || t.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Activa</Label>
                <p className="text-xs text-muted-foreground">Las inactivas no se muestran a los tenants.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || uploading || !canSave}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta notificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará para <strong>todos los tenants</strong> que la estén viendo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
