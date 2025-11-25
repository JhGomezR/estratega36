'use client'

import { useState } from 'react'
import { analyzeCampaignData, type AnalyzeCampaignDataOutput } from '@/ai/flows/analyze-campaign-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { BrainCircuit, Loader2, BarChart, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Campaign, Voter } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import { Progress } from './ui/progress'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'

interface AnalysisClientProps {
  campaigns: Campaign[];
  isLoading: boolean;
}

const topicColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-indigo-500",
  "bg-pink-500",
];

const impactColors: Record<string, string> = {
  'Alto': 'bg-red-500/20 text-red-700',
  'Medio': 'bg-yellow-500/20 text-yellow-700',
  'Bajo': 'bg-green-500/20 text-green-700',
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
    const campaignDataForAI = JSON.stringify({
        campaignDetails: {
            name: selectedCampaign.name,
            description: selectedCampaign.description,
            type: selectedCampaign.campaignType,
            progress: selectedCampaign.progress,
        },
        voterStats: {
            total: voters.length,
            cityDistribution: cityCounts,
            sectorDistribution: sectorCounts,
        }
    });
    
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
    <div className="space-y-8">
      <Card>
        <CardHeader>
            <CardTitle>Análisis Automatizado</CardTitle>
            <CardDescription>Selecciona una campaña activa y la IA analizará sus datos de votantes y progreso para generar insights.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <Select onValueChange={setSelectedCampaignId} disabled={isLoading || isAnalyzing}>
                <SelectTrigger className="w-full sm:w-[300px]">
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
            <Button onClick={handleAnalyze} disabled={isAnalyzing || isLoading || !selectedCampaignId} className="w-full sm:w-auto">
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
      
      <div className="space-y-8">
        {isAnalyzing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent></Card>
                <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/3 mb-4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
            </div>
        )}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5" /> Tendencias de Participación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {result.participationTrends.map((trend, index) => (
                        <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className={cn("font-medium", trend.isProjection && "text-primary")}>{trend.label}</span>
                                <span className={cn("font-semibold", trend.isProjection && "text-primary")}>{trend.value}%</span>
                            </div>
                            <Progress value={trend.value} className={cn(trend.isProjection && "[&>div]:bg-primary")} />
                        </div>
                    ))}
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Temas de Mayor Interés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {result.interestTopics.map((topic, index) => (
                        <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium">{topic.topic}</span>
                                <span className="font-semibold">{topic.value}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5">
                                <div className={cn("h-2.5 rounded-full", topicColors[index % topicColors.length])} style={{ width: `${topic.value}%` }}></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
             </Card>
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Recomendaciones Estratégicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {result.recommendations.map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">Esfuerzo: {rec.effort}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0">
                           <Badge className={cn("text-xs font-bold", impactColors[rec.impact])}>
                            Impacto: {rec.impact}
                           </Badge>
                           <Button variant="link" className="h-auto p-0 text-sm">
                             Aplicar recomendación →
                           </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
             </Card>
          </div>
        )}
        {!isAnalyzing && !result && (
             <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
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
