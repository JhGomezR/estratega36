
"use client";
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { VotersMap } from '@/components/voters-map';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import type { Voter, City, Department } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type VoterWithColor = Voter & { color?: string };

function generateColorFromString(str: string, saturation = 90, lightness = 55): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Ensure the hue is not in the green range (e.g., 80-160 degrees)
    const hue = hash % 360;
    const adjustedHue = hue > 80 && hue < 160 ? (hue + 180) % 360 : hue;
    
    return `hsl(${adjustedHue}, ${saturation}%, ${lightness}%)`;
}


export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const firestore = useFirestore();

  const votersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `voters`) : null, [firestore]);
  const citiesCollectionGroup = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'cities') : null, [firestore]);
  const departmentsCollectionGroup = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'departments') : null, [firestore]);

  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(votersCollectionRef);
  const { data: allCities, isLoading: citiesLoading } = useCollection<City>(citiesCollectionGroup);
  const { data: allDepartments, isLoading: departmentsLoading } = useCollection<Department>(departmentsCollectionGroup);

  const voterCountsByCity = React.useMemo(() => {
    if (!voters || !allCities || !allDepartments) return [];
    
    const activeVoters = voters.filter(v => v.status === 'activo');
    const counts = new Map<string, number>();
    activeVoters.forEach(voter => {
      counts.set(voter.cityId, (counts.get(voter.cityId) || 0) + 1);
    });
    
    const departmentMap = new Map(allDepartments.map(d => [d.id, d.name]));

    return allCities
      .map(city => {
        const departmentName = departmentMap.get(city.parentDepartmentId) || 'Desconocido';
        return {
            ...city,
            voterCount: counts.get(city.id) || 0,
            color: generateColorFromString(city.id),
            department: departmentName,
        }
      })
      .filter(city => city.voterCount > 0)
      .sort((a, b) => b.voterCount - a.voterCount);

  }, [voters, allCities, allDepartments]);
  
  const votersWithLocation: VoterWithColor[] = React.useMemo(() => {
    if (!voters) return [];
    const activeVoters = voters.filter(v => v.status === 'activo');
    const cityColorMap = new Map(voterCountsByCity.map(c => [c.id, c.color]));
    return activeVoters
      .filter(voter => voter.latitude && voter.longitude)
      .map(voter => ({
          ...voter,
          color: cityColorMap.get(voter.cityId)
      }));
  }, [voters, voterCountsByCity]);

  const isLoading = votersLoading || citiesLoading || departmentsLoading;

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className="flex flex-col gap-8">
         <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Votantes</h1>
          <p className="text-muted-foreground">Visualiza la distribución geográfica de tus votantes.</p>
        </div>
        <Card>
          <CardContent className="p-6">
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
      <Card className="h-[75vh] flex flex-col">
        <CardContent className="p-0 flex-1 grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 h-full w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full w-full bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <VotersMap apiKey={apiKey} voters={votersWithLocation} />
            )}
          </div>
          <div className="lg:col-span-1 border-l overflow-y-auto">
            <div className="p-4 sticky top-0 bg-card/80 backdrop-blur-sm z-10">
              <h3 className="text-lg font-semibold">Votantes por Ciudad</h3>
              <p className="text-sm text-muted-foreground">Conteo total por municipio.</p>
            </div>
            <Separator />
            <div className="p-4 space-y-4">
              {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
              ) : voterCountsByCity.length > 0 ? (
                voterCountsByCity.map(city => (
                    <div key={city.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: city.color }}></span>
                           <div>
                                <p className="font-medium">{city.name}</p>
                                <p className="text-sm text-muted-foreground">{city.department}</p>
                           </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
