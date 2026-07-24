'use client';

/**
 * Control Plane — Marca del LOGIN (global, una sola para toda la plataforma).
 *
 * La pantalla de login lee `settings/branding` de la base `(default)` SIN
 * autenticar, por eso el branding del login es unico y global (no por tenant).
 * Aqui el operador de plataforma lo edita; las reglas transitorias permiten a
 * `platformAdmin` escribir `settings/branding` en `(default)`.
 *
 * La imagen se guarda incrustada como data URI, asi no depende de allow-lists
 * de dominios en next.config (images.remotePatterns) ni de un hosting externo.
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

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB: el data URI se guarda en el doc de Firestore (limite 1 MiB por campo tras base64 ~1.4 MB).
const MAX_SAFE_DATAURI = 900 * 1024; // margen por debajo del limite de 1 MiB de Firestore.

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export default function LoginBrandingPage() {
  const defaultDb = useDefaultDb();
  const { toast } = useToast();

  // SIEMPRE la base (default): el branding del login es global, no del tenant
  // que un operador pudiera estar impersonando.
  const brandingRef = useMemoFirebase(() => doc(defaultDb, 'settings/branding'), [defaultDb]);
  const { data: branding, isLoading } = useDoc<BrandingSettings>(brandingRef);

  const [loginImageUrl, setLoginImageUrl] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (branding && !dirty) {
      setLoginImageUrl(branding.loginImageUrl || '');
      setLogoUrl(branding.logoUrl || '');
    }
  }, [branding, dirty]);

  const onPickImage = async (file: File | undefined, target: 'login' | 'logo') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Selecciona una imagen (jpg, png, webp…).' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ variant: 'destructive', title: 'Imagen muy pesada', description: 'Máximo 2 MB. Comprime la imagen e inténtalo de nuevo.' });
      return;
    }
    const dataUri = await fileToDataUri(file);
    if (dataUri.length > MAX_SAFE_DATAURI && target === 'login') {
      toast({ variant: 'destructive', title: 'Imagen muy grande al codificar', description: 'Usa una imagen más liviana (idealmente < 700 KB) o una URL pública.' });
      return;
    }
    setDirty(true);
    if (target === 'login') setLoginImageUrl(dataUri);
    else setLogoUrl(dataUri);
  };

  const save = async () => {
    setSaving(true);
    try {
      setDocumentNonBlocking(brandingRef, { loginImageUrl, logoUrl }, { merge: true });
      toast({ title: 'Marca del login actualizada', description: 'Recarga la pantalla de login para verla.' });
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
        <h1 className="text-3xl font-bold tracking-tight">Marca del login</h1>
        <p className="text-muted-foreground">
          Imagen y logo de la pantalla de inicio de sesión. Es <strong>única para toda la plataforma</strong>: la ven todos los usuarios de todos los tenants.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imagen de fondo</CardTitle>
          <CardDescription>Se muestra en el lado derecho del login. Recomendado: vertical, ~1200×1800, menos de 700 KB.</CardDescription>
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
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0], 'login')}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Subir imagen
            </Button>
            {loginImageUrl && (
              <Button variant="ghost" onClick={() => { setDirty(true); setLoginImageUrl(''); }}>Quitar</Button>
            )}
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
