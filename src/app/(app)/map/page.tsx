
"use client";
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VotersMap } from '@/components/voters-map';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Voter, City } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FED766", "#2AB7CA",
  "#F0C419", "#FF8C42", "#FF3D7F", "#3498DB", "#9B59B6",
  "#E74C3C", "#2ECC71", "#F1C40F", "#1ABC9C", "#E67E22"
];

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const firestore = useFirestore();

  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(
    useMemoFirebase(() => firestore ? collection(firestore, 'cities') : null, [firestore])
  );

  const cityVoterData = React.useMemo(() => {
    if (!voters || !cities) return [];

    const counts: Record<string, number> = {};
    for (const voter of voters) {
      counts[voter.cityId] = (counts[voter.cityId] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([cityId, count], index) => {
        const city = cities.find(c => c.id === cityId);
        if (!city) return null;
        return {
          id: cityId,
          name: city.name,
          count,
          latitude: city.latitude,
          longitude: city.longitude,
          color: COLORS[index % COLORS.length]
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.count - a.count);

  }, [voters, cities]);

  const isLoading = votersLoading || citiesLoading;

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className="flex flex-col gap-8">
         <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Votantes</h1>
          <p className="text-muted-foreground">Visualiza la distribución geográfica de tus votantes.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Configuración Requerida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                <p className="font-bold">Se necesita una clave de API de Google Maps.</p>
                <p className="text-sm">
                    Para mostrar el mapa, por favor sigue estos pasos:
                </p>
                <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                    <li>Ve a la <a href="https://console.cloud.google.com/google/maps-apis/overview" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Cloud Console</a>.</li>
                    <li>Crea u obtén tu clave de API de Google Maps. Asegúrate de que las APIs "Maps JavaScript API" y "Geocoding API" estén habilitadas.</li>
                    <li>Abre el archivo <code className="px-1 py-0.5 bg-yellow-200 rounded text-xs">.env.local</code> en la raíz de tu proyecto (si no existe, créalo).</li>
                    <li>Añade la siguiente línea: <code className="px-1 py-0.5 bg-yellow-200 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_CLAVE_DE_API_AQUI</code></li>
                    <li>Reemplaza <code className="px-1 py-0.5 bg-yellow-200 rounded text-xs">TU_CLAVE_DE_API_AQUI</code> con tu clave de API real.</li>
                    <li>Reinicia el servidor de desarrollo para aplicar los cambios.</li>
                </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mapa de Votantes</h1>
        <p className="text-muted-foreground">Visualiza la distribución geográfica y densidad de tus votantes por ciudad.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor de Votantes</CardTitle>
          <CardDescription>
            Círculos más grandes y de color intenso indican mayor concentración de votantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 relative w-full h-[60vh] rounded-lg overflow-hidden border shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center h-full w-full bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <VotersMap apiKey={apiKey} cityData={cityVoterData} />
            )}
          </div>
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4 text-lg">Información</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-5 bg-muted rounded w-1/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : cityVoterData.length > 0 ? (
              <ul className="space-y-3">
                {cityVoterData.map(city => (
                  <li key={city.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: city.color }}></span>
                      <span>{city.name}</span>
                    </div>
                    <span className="font-semibold">{city.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay datos de votantes para mostrar.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    