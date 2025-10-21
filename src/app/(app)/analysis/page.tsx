import { AnalysisClient } from "@/components/analysis-client";

export default function AnalysisPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Campaña con IA</h1>
        <p className="text-muted-foreground">
          Descubre tendencias, oportunidades y recomendaciones a partir de tus datos.
        </p>
      </div>
      <AnalysisClient />
    </div>
  )
}
