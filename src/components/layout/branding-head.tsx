'use client';

/**
 * Aplica el branding global (favicon y título del navegador) leyendo
 * `settings/branding` de la base `(default)`. Se monta una sola vez en el layout
 * raíz. La lectura de `settings/branding` está permitida sin autenticar, así que
 * el favicon/título se aplican también en el login.
 */

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useDefaultDb, useDoc, useMemoFirebase } from '@/firebase';
import type { BrandingSettings } from '@/lib/types';

export function BrandingHead() {
  const defaultDb = useDefaultDb();
  const ref = useMemoFirebase(() => (defaultDb ? doc(defaultDb, 'settings/branding') : null), [defaultDb]);
  const { data } = useDoc<BrandingSettings>(ref);

  React.useEffect(() => {
    if (data?.appName) document.title = data.appName;
  }, [data?.appName]);

  React.useEffect(() => {
    if (!data?.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = data.faviconUrl;
  }, [data?.faviconUrl]);

  return null;
}
