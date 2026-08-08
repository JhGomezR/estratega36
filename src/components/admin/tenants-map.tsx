'use client';

/**
 * Mapa de ubicaciones de tenants (Colombia) con react-simple-maps.
 * NO consume APIs de mapas: usa un GeoJSON estático (`/geo/colombia.geo.json`)
 * y coordenadas fijas por ciudad (`CO_CITIES`). Un marcador por ciudad, con
 * tamaño según cuántos tenants hay ahí.
 */

import * as React from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { CO_CITIES } from '@/lib/co-cities';
import type { Tenant } from '@/lib/types';

const GEO_URL = '/geo/colombia.geo.json';

export function TenantsMap({ tenants }: { tenants: Tenant[] }) {
  const byCity = React.useMemo(() => {
    const m = new Map<string, number>();
    tenants.forEach((t) => {
      if (t.city && CO_CITIES[t.city]) m.set(t.city, (m.get(t.city) || 0) + 1);
    });
    return [...m.entries()];
  }, [tenants]);

  const sinUbicacion = tenants.filter((t) => !t.city || !CO_CITIES[t.city]).length;

  return (
    <div>
      <div className="mx-auto h-[420px] w-full max-w-xl">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-73.5, 4.2], scale: 1900 }}
          width={520}
          height={520}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: 'hsl(var(--muted))' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
          {byCity.map(([city, count]) => (
            <Marker key={city} coordinates={CO_CITIES[city]}>
              <circle
                r={Math.min(4 + count * 2, 14)}
                fill="#6366f1"
                fillOpacity={0.75}
                stroke="#fff"
                strokeWidth={1}
              />
              <title>{`${city}: ${count} tenant(s)`}</title>
            </Marker>
          ))}
        </ComposableMap>
      </div>
      {sinUbicacion > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {sinUbicacion} tenant(s) sin ciudad ubicable no se muestran en el mapa.
        </p>
      )}
    </div>
  );
}
