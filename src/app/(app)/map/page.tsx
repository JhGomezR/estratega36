import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VotersMap } from '@/components/voters-map';

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
                    <li>Abre el archivo <code className="px-1 py-0.5 bg-yellow-200 rounded text-xs">.env.local</code> en la raíz de tu proyecto.</li>
                    <li>Reemplaza <code className="px-1 py-0.5 bg-yellow-200 rounded text-xs">YOUR_GOOGLE_MAPS_API_KEY_HERE</code> con tu clave de API real.</li>
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
        <p className="text-muted-foreground">Visualiza la distribución geográfica de tus votantes.</p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Ubicaciones de Votantes</CardTitle>
            <CardDescription>
                Este mapa interactivo muestra las ubicaciones de los votantes registrados.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[60vh] rounded-lg overflow-hidden border shadow-sm">
             <VotersMap apiKey={apiKey} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
