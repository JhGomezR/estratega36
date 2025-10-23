
"use client";
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VotersMap } from '@/components/voters-map';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Voter, City } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const firestore = useFirestore();

  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(
    useMemoFirebase(() => firestore ? collection(firestore, 'cities') : null, [firestore])
  );

  const votersWithLocation = React.useMemo(() => {
    return voters?.filter(voter => voter.latitude && voter.longitude) || [];
  }, [voters]);

  const voterCountsByCity = React.useMemo(() => {
    if (!voters || !cities) return [];
    
    const counts = new Map<string, number>();
    voters.forEach(voter => {
      counts.set(voter.cityId, (counts.get(voter.cityId) || 0) + 1);
    });

    return cities
      .map(city => ({
        ...city,
        voterCount: counts.get(city.id) || 0,
      }))
      .filter(city => city.voterCount > 0)
      .sort((a, b) => b.voterCount - a.voterCount);

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
        <p className="text-muted-foreground">Visualiza la ubicación de tus votantes y el conteo por ciudad.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card className="h-full">
                <CardContent className="h-[75vh] w-full p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full w-full bg-muted">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <VotersMap apiKey={apiKey} voters={votersWithLocation} />
                    )}
                </CardContent>
            </Card>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Votantes por Ciudad</CardTitle>
                    <CardDescription>Conteo total de votantes registrados en cada ciudad.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[65vh]">
                    <div className="space-y-4">
                      {isLoading ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                      ) : voterCountsByCity.length > 0 ? (
                        voterCountsByCity.map(city => (
                            <div key={city.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{city.name}</p>
                                    <p className="text-sm text-muted-foreground">{city.department}</p>
                                </div>
                                <div className="text-lg font-bold text-primary">
                                    {city.voterCount}
                                </div>
                            </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-10">No hay votantes con ubicación para mostrar.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
