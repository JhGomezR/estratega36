import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MapPage() {
  const mapImage = PlaceHolderImages.find(img => img.id === 'map-placeholder');

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
                Este mapa muestra las ubicaciones de los votantes registrados para una segmentación y focalización efectivas.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[60vh] rounded-lg overflow-hidden border shadow-sm">
            {mapImage ? (
              <Image
                src={mapImage.imageUrl}
                alt={mapImage.description}
                fill
                style={{ objectFit: 'cover' }}
                data-ai-hint={mapImage.imageHint}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p>Map placeholder image not found.</p>
              </div>
            )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
