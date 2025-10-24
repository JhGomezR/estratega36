import { StrategiesClient } from "@/components/strategies-client";

export const maxDuration = 120; // Aumenta el timeout a 2 minutos

export default function StrategiesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generador de Estrategias con IA</h1>
        <p className="text-muted-foreground">
          Crea estrategias de campaña detalladas y efectivas basadas en datos.
        </p>
      </div>
      <StrategiesClient />
    </div>
  )
}
