'use client';

import * as React from 'react';
import { useAuth } from '@/firebase';
import { getActiveCities } from '@/app/admin/locations/actions';

/**
 * Municipios DISPONIBLES (activos) para selectores y mapas del Control Plane.
 * Lee del catálogo de ubicaciones vía Server Action (Admin SDK). Devuelve los
 * nombres (ordenados) y un mapa etiqueta → [lng, lat].
 */
export function useActiveCities() {
  const auth = useAuth();
  const [cities, setCities] = React.useState<{ label: string; lat: number; lng: number }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const t = await auth.currentUser?.getIdToken();
        if (!t) return;
        const res = await getActiveCities({ idToken: t });
        if (!cancel) setCities(res.cities || []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [auth]);

  const names = React.useMemo(
    () => cities.map((c) => c.label).sort((a, b) => a.localeCompare(b, 'es')),
    [cities]
  );
  const coords = React.useMemo(() => {
    const m: Record<string, [number, number]> = {};
    cities.forEach((c) => { m[c.label] = [c.lng, c.lat]; });
    return m;
  }, [cities]);

  return { names, coords, loading };
}
