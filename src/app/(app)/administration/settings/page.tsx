import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración de la Plataforma</h1>
        <p className="text-muted-foreground">Personaliza la apariencia y el comportamiento de la aplicación.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personalización de la Marca</CardTitle>
          <CardDescription>
            Ajusta los colores, el logo y el fondo para que coincidan con la identidad de tu campaña.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="primary-color">Color Primario</Label>
            <div className="flex items-center gap-2 col-span-2">
                <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: 'hsl(232 65% 30%)' }}></div>
                <Input id="primary-color" defaultValue="#1A237E" className="w-40" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="accent-color">Color de Acento</Label>
            <div className="flex items-center gap-2 col-span-2">
                 <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: 'hsl(45 100% 51%)' }}></div>
                <Input id="accent-color" defaultValue="#FFC107" className="w-40" />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="logo">Logo de la Campaña</Label>
            <div className="col-span-2">
                <Input id="logo" type="file" />
            </div>
          </div>
           <div className="flex justify-end">
            <Button>Guardar Cambios</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
