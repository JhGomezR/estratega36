'use client'

import { useState } from 'react'
import { analyzeCampaignData, type AnalyzeCampaignDataOutput } from '@/ai/flows/analyze-campaign-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Campaign, Voter } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface AnalysisClientProps {
  campaigns: Campaign[];
  isLoading: boolean;
}

export function AnalysisClient({ campaigns, isLoading: campaignsLoading }: AnalysisClientProps) {
  const [result, setResult] = useState<AnalyzeCampaignDataOutput | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { toast } = useToast()
  const firestore = useFirestore();

  const votersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore]);
  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(votersCollectionRef);

  async function handleAnalyze() {
    if (!selectedCampaignId) {
        toast({
            variant: 'destructive',
            title: 'Selecciona una campaña',
            description: 'Debes elegir una campaña para poder analizarla.',
        });
        return;
    }

    setIsAnalyzing(true)
    setResult(null)

    const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!selectedCampaign || !voters) {
        toast({
            variant: 'destructive',
            title: 'Error de datos',
            description: 'No se encontraron los datos de la campaña o votantes.',
        });
        setIsAnalyzing(false);
        return;
    }
    
    // Aggregate voter data
    const cityCounts: Record<string, number> = {};
    const sectorCounts: Record<string, number> = {};
    voters.forEach(voter => {
        if(voter.cityId) cityCounts[voter.cityId] = (cityCounts[voter.cityId] || 0) + 1;
        if(voter.sector) sectorCounts[voter.sector] = (sectorCounts[voter.sector] || 0) + 1;
    });


    // Prepare data for the AI
    const campaignDataForAI = `
        Nombre de la campaña: ${selectedCampaign.name}
        Descripción: ${selectedCampaign.description}
        Tipo: ${selectedCampaign.campaignType}
        Progreso actual: ${selectedCampaign.progress}%
        Total de votantes registrados: ${voters.length}
        Distribución de votantes por ciudad: ${JSON.stringify(cityCounts)}
        Distribución de votantes por sector laboral: ${JSON.stringify(sectorCounts)}
    `;
    
    const campaignObjectivesForAI = selectedCampaign.goal;

    try {
      const aiResult = await analyzeCampaignData({
        campaignData: campaignDataForAI,
        campaignObjectives: campaignObjectivesForAI,
      })
      setResult(aiResult)
    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Error de Análisis',
        description: 'No se pudo completar el análisis. Por favor, inténtalo de nuevo.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const isLoading = campaignsLoading || votersLoading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="flex flex-col items-center justify-center p-8 min-h-[400px]">
            <CardHeader className="text-center">
                <CardTitle>Análisis Automatizado</CardTitle>
                <CardDescription>Selecciona una campaña activa y la IA analizará sus datos de votantes y progreso para generar insights.</CardDescription>
            </CardHeader>
            <CardContent className="w-full max-w-sm space-y-6">
                <div className="space-y-2">
                    <Select onValueChange={setSelectedCampaignId} disabled={isLoading || isAnalyzing}>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoading ? "Cargando campañas..." : "Selecciona una campaña"} />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoading ? (
                                <SelectItem value="loading" disabled>Cargando...</SelectItem>
                            ) : campaigns.length > 0 ? (
                                campaigns.map(campaign => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                    {campaign.name}
                                </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="no-campaigns" disabled>No hay campañas activas</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                 <Button onClick={handleAnalyze} disabled={isAnalyzing || isLoading || !selectedCampaignId} className="w-full">
                    {isAnalyzing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    )}
                    {isAnalyzing ? 'Analizando...' : 'Analizar Campaña con IA'}
                </Button>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground text-center">La IA utilizará los datos de votantes (ciudades, sectores) y el estado actual de la campaña seleccionada.</p>
             </CardFooter>
        </Card>
      
      <div className="space-y-4">
        {isAnalyzing && (
            <>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
            </>
        )}
        {result && (
          <>
            <Alert>
                <BrainCircuit className="h-4 w-4" />
                <AlertTitle>Análisis Completado</AlertTitle>
                <AlertDescription>
                    Resultados generados por la IA para la campaña seleccionada.
                </AlertDescription>
            </Alert>
            <Card className="bg-card/80 border-primary/50 shadow-lg">
              <CardHeader>
                <CardTitle>Tendencias Clave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{result.keyTrends}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-primary/50 shadow-lg">
              <CardHeader>
                <CardTitle>Nuevas Oportunidades</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{result.newOpportunities}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-accent/50 shadow-lg">
              <CardHeader>
                <CardTitle>Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{result.recommendations}</p>
              </CardContent>
            </Card>
          </>
        )}
        {!isAnalyzing && !result && (
             <Card className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[400px]">
                <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Resultados del Análisis</h3>
                <p className="text-muted-foreground text-sm">
                    Selecciona una campaña y haz clic en "Analizar" para ver los resultados aquí.
                </p>
            </Card>
        )}
      </div>
    </div>
  )
}
