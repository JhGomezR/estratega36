'use client';

/**
 * Mapa de ubicaciones de tenants (Colombia) con react-simple-maps.
 * NO consume APIs de mapas: GeoJSON estático (`/geo/colombia.geo.json`) +
 * coordenadas fijas por ciudad (`CO_CITIES`). Un marcador por ciudad (color y
 * tamaño según cuántos tenants hay), con línea de llamado (Annotation) y una
 * leyenda lateral. El encuadre incluye el Archipiélago de San Andrés.
 */

import * as React from 'react';
import { ComposableMap, Geographies, Geography, Marker, Annotation } from 'react-simple-maps';
import { CO_CITIES } from '@/lib/co-cities';
import type { Tenant } from '@/lib/types';

const GEO_URL = '/geo/colombia.geo.json';

const PALETTE = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7',
  '#ec4899', '#14b8a6', '#f97316', '#0ea5e9', '#84cc16', '#e11d48',
];

export function TenantsMap({ tenants }: { tenants: Tenant[] }) {
  const data = React.useMemo(() => {
    const m = new Map<string, number>();
    tenants.forEach((t) => {
      if (t.city && CO_CITIES[t.city]) m.set(t.city, (m.get(t.city) || 0) + 1);
    });
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([city, count], i) => ({ city, count, color: PALETTE[i % PALETTE.length], coords: CO_CITIES[city] }));
  }, [tenants]);

  const sinUbicacion = tenants.filter((t) => !t.city || !CO_CITIES[t.city]).length;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="h-[440px] w-full lg:flex-1">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-74.5, 5], scale: 1300 }}
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

          {data.map((d) => {
            // Etiqueta hacia afuera: a la izquierda si el marcador está al
            // occidente del centro, a la derecha si está al oriente.
            const toLeft = d.coords[0] < -74.5;
            const dx = toLeft ? -30 : 30;
            return (
              <React.Fragment key={d.city}>
                <Annotation
                  subject={d.coords}
                  dx={dx}
                  dy={-18}
                  connectorProps={{ stroke: d.color, strokeWidth: 1.2, strokeLinecap: 'round' }}
                >
                  <text
                    x={toLeft ? -4 : 4}
                    y={0}
                    textAnchor={toLeft ? 'end' : 'start'}
                    alignmentBaseline="middle"
                    style={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                  >
                    {d.city} ({d.count})
                  </text>
                </Annotation>
                <Marker coordinates={d.coords}>
                  <circle
                    r={Math.min(4 + d.count * 2, 14)}
                    fill={d.color}
                    fillOpacity={0.85}
                    stroke="#fff"
                    strokeWidth={1.2}
                  />
                </Marker>
              </React.Fragment>
            );
          })}
        </ComposableMap>
      </div>

      <div className="w-full lg:w-56">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciudades</p>
        <ul className="space-y-1.5">
          {data.map((d) => (
            <li key={d.city} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate">{d.city}</span>
              </span>
              <span className="shrink-0 font-semibold">{d.count}</span>
            </li>
          ))}
          {data.length === 0 && <li className="text-sm text-muted-foreground">Sin ciudades asignadas.</li>}
        </ul>
        {sinUbicacion > 0 && (
          <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{sinUbicacion} tenant(s) sin ciudad ubicable.</p>
        )}
      </div>
    </div>
  );
}
