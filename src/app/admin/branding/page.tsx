'use client';

/**
 * Control Plane — BRANDING de la plataforma (global, único para todos).
 *
 * Vive en `settings/branding` de la base `(default)`; su lectura está permitida
 * sin autenticar (la usan el login y el favicon/título globales). Las imágenes
 * se guardan incrustadas como data URI para no depender de dominios externos.
 */

import * as React from 'react';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Loader2, Upload, ImageIcon } from 'lucide-react';
import { useDefaultDb, useDoc, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { BrandingSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_SAFE_DATAURI = 900 * 1024; // margen bajo el límite de 1 MiB de Firestore
const MAX_ICON_DATAURI = 200 * 1024; // logo/favicon deben ser livianos

type Target = 'login' | 'logo' | 'favicon';

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export default function BrandingPage() {
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  const brandingRef = useMemoFirebase(() => doc(defaultDb, 'settings/branding'), [defaultDb]);
  const { data: branding, isLoading } = useDoc<BrandingSettings>(brandingRef);

  const [appName, setAppName] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [faviconUrl, setFaviconUrl] = React.useState('');
  const [loginImageUrl, setLoginImageUrl] = React.useState('');
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const loginInput = React.useRef<HTMLInputElement>(null);
  const logoInput = React.useRef<HTMLInputElement>(null);
  const faviconInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (branding && !dirty) {
      setAppName(branding.appName || '');
      setLogoUrl(branding.logoUrl || '');
      setFaviconUrl(branding.faviconUrl || '');
      setLoginImageUrl(branding.loginImageUrl || '');
    }
  }, [branding, dirty]);

  const onPickImage = async (file: File | undefined, target: Target) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Selecciona una imagen (jpg, png, webp, svg…).' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ variant: 'destructive', title: 'Imagen muy pesada', description: 'Máximo 2 MB.' });
      return;
    }
    const dataUri = await fileToDataUri(file);
    const cap = target === 'login' ? MAX_SAFE_DATAURI : MAX_ICON_DATAURI;
    if (dataUri.length > cap) {
      toast({
        variant: 'destructive',
        title: 'Imagen demasiado grande',
        description: target === 'login' ? 'Usa una imagen < 700 KB.' : 'El logo/favicon debe ser liviano (< 150 KB).',
      });
      return;
    }
    setDirty(true);
    if (target === 'login') setLoginImageUrl(dataUri);
    else if (target === 'logo') setLogoUrl(dataUri);
    else setFaviconUrl(dataUri);
  };

  const save = async () => {
    setSaving(true);
    try {
      setDocumentNonBlocking(brandingRef, { appName, logoUrl, faviconUrl, loginImageUrl }, { merge: true });
      toast({ variant: 'success', title: 'Branding actualizado', description: 'El favicon y el título se aplican al recargar.' });
      setDirty(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
        <p className="text-muted-foreground">
          Identidad visual de la plataforma. Es <strong>única para todos</strong>: la ven todos los usuarios de todos los tenants.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identidad</CardTitle>
          <CardDescription>Nombre, logo y favicon de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1 max-w-sm">
            <Label>Nombre de la plataforma</Label>
            <Input value={appName} onChange={(e) => { setDirty(true); setAppName(e.target.value); }} placeholder="Ej: Estratega 360" />
            <p className="text-xs text-muted-foreground">Se usa como título de la pestaña del navegador.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Logo" width={160} height={80} className="max-h-full max-w-full object-contain" unoptimized />
                ) : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0], 'logo')} />
                <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()}><Upload className="mr-2 h-4 w-4" /> Subir</Button>
                {logoUrl && <Button variant="ghost" size="sm" onClick={() => { setDirty(true); setLogoUrl(''); }}>Quitar</Button>}
              </div>
            </div>

            {/* Favicon */}
            <div className="space-y-2">
              <Label>Favicon</Label>
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {faviconUrl ? (
                  <Image src={faviconUrl} alt="Favicon" width={48} height={48} className="h-12 w-12 object-contain" unoptimized />
                ) : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <input ref={faviconInput} type="file" accept="image/png,image/x-icon,image/svg+xml,image/webp" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0], 'favicon')} />
                <Button variant="outline" size="sm" onClick={() => faviconInput.current?.click()}><Upload className="mr-2 h-4 w-4" /> Subir</Button>
                {faviconUrl && <Button variant="ghost" size="sm" onClick={() => { setDirty(true); setFaviconUrl(''); }}>Quitar</Button>}
              </div>
              <p className="text-xs text-muted-foreground">Cuadrado, idealmente 64×64 PNG.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pantalla de login</CardTitle>
          <CardDescription>Imagen de fondo del inicio de sesión. Recomendado: vertical, ~1200×1800, &lt; 700 KB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-[3/4] max-w-xs overflow-hidden rounded-lg border bg-muted">
            {loginImageUrl ? (
              <Image src={loginImageUrl} alt="Vista previa del fondo de login" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={loginInput} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0], 'login')} />
            <Button variant="outline" onClick={() => loginInput.current?.click()}><Upload className="mr-2 h-4 w-4" /> Subir imagen</Button>
            {loginImageUrl && <Button variant="ghost" onClick={() => { setDirty(true); setLoginImageUrl(''); }}>Quitar</Button>}
          </div>
          <div className="space-y-1">
            <Label>…o pega una URL pública</Label>
            <Input
              value={loginImageUrl.startsWith('data:') ? '' : loginImageUrl}
              placeholder={loginImageUrl.startsWith('data:') ? '(imagen subida como archivo)' : 'https://…/imagen.jpg'}
              onChange={(e) => { setDirty(true); setLoginImageUrl(e.target.value); }}
            />
            <p className="text-xs text-muted-foreground">Si usas URL, su dominio debe estar permitido en <code>next.config.js</code>. Subir el archivo evita ese paso.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar cambios
        </Button>
      </div>
    </div>
  );
}
