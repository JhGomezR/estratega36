"use client"
import { AnalysisClient } from "@/components/analysis-client";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Campaign } from "@/lib/types";

export default function AnalysisPage() {
  const firestore = useFirestore();
  const campaignsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore]);
  const { data: campaigns, isLoading } = useCollection<Campaign>(campaignsCollectionRef);

  const activeCampaigns = campaigns?.filter(c => c.status === 'En Campaña') || [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Campaña con IA</h1>
        <p className="text-muted-foreground">
          Descubre tendencias, oportunidades y recomendaciones a partir de tus datos.
        </p>
      </div>
      <AnalysisClient campaigns={activeCampaigns} isLoading={isLoading} />
    </div>
  )
}
