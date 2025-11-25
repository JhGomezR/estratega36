'use client'

import React, { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Lightbulb, Loader2, BarChart, TrendingUp, Target, Users, Bot, Award } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Campaign, Voter, City } from '@/lib/types'
import { analyzeCampaignData, type AnalyzeCampaignDataOutput } from '@/ai/flows/analyze-campaign-data'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  campaignId: z.string({ required_error: 'Debes seleccionar una campaña.' }),
})

interface AnalysisClientProps {
  campaigns: Campaign[];
  voters: Voter[];
  cities: City[];
  isLoading: boolean;
}

const InsightCard = ({ icon: Icon, title, description, confidence }: { icon: React.ElementType, title: string, description: string, confidence: number }) => (
    <Card className="flex-1">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {title}
                </CardTitle>
            </div>
             <div className="text-xs text-muted-foreground">{confidence}%</div>
        </CardHeader>
        <CardContent>
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
            <Progress value={confidence} className="h-2"/>
        </CardContent>
    </Card>
);

const RecommendationCard = ({ title, description, effort, impact }: { title: string; description: string; effort: string; impact: string }) => {
    const impactColors: Record<string, string> = {
        'Bajo': 'bg-yellow-500',
        'Medio': 'bg-orange-500',
        'Alto': 'bg-green-500',
    };
    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <Badge className={cn("hover:bg-none", impactColors[impact] || 'bg-gray-500')}>Impacto {impact}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{description}</p>
                <div className="text-xs text-muted-foreground">
                    <span className="font-semibold">Esfuerzo estimado:</span> {effort}
                </div>
            </CardContent>
        </Card>
    );
};

const ProgressBar = ({ label, value, colorClass }: { label: string; value: number, colorClass: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-sm">
            <span className="font-medium text-muted-foreground">{label}</span>
            <span className="font-semibold" style={{color: colorClass.startsWith('#') ? colorClass : undefined}}>{value}%</span>
        </div>
        <Progress value={value} indicatorClassName={colorClass} />
    </div>
);


export function AnalysisClient({ campaigns, voters, cities, isLoading }: AnalysisClientProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeCampaignDataOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const cityMap = useMemo(() => {
    return new Map(cities.map(city => [city.id, city.name]));
  }, [cities]);
  
  const topicColors: Record<string, string> = {
    primary: "bg-primary",
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setAnalysisResult(null);

    try {
        const selectedCampaign = campaigns.find(c => c.id === values.campaignId);
        if (!selectedCampaign) {
            toast({ variant: 'destructive', title: 'Error', description: 'Campaña no encontrada.' });
            return;
        }

        const campaignVoters = voters.filter(voter => {
            // Simplified logic: consider all voters for the analysis for now
            // This can be refined to filter by users associated with the campaign
            return true;
        });
        
        const votersByCity = campaignVoters.reduce((acc, voter) => {
            const cityName = cityMap.get(voter.cityId) || 'Desconocida';
            acc[cityName] = (acc[cityName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const votersBySector = campaignVoters.reduce((acc, voter) => {
            const sector = voter.sector || 'No especificado';
            acc[sector] = (acc[sector] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);


        const inputData = {
            campaignName: selectedCampaign.name,
            campaignGoal: selectedCampaign.goal,
            voterCount: campaignVoters.length,
            votersByCity,
            votersBySector,
        };

      const result = await analyzeCampaignData(inputData);
      setAnalysisResult(result);
      toast({
        title: 'Análisis Completo',
        description: 'La IA ha generado el análisis para la campaña seleccionada.',
      });

    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        variant: 'destructive',
        title: 'Error en el Análisis',
        description: 'No se pudo generar el análisis. Revisa la consola para más detalles.',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Panel de Control</CardTitle>
                <CardDescription>Selecciona una campaña activa para analizarla con IA.</CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
                 <FormField
                    control={form.control}
                    name="campaignId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Campaña</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isGenerating}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={isLoading ? "Cargando campañas..." : "Selecciona una campaña"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {campaigns.map(campaign => (
                                        <SelectItem key={campaign.id} value={campaign.id}>
                                            {campaign.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
                 <Button type="submit" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Analizando...' : 'Analizar Campaña con IA'}
                </Button>
                <p className="text-xs text-muted-foreground">La IA utilizará los datos de votantes (ciudades, sectores) y el estado actual de la campaña seleccionada.</p>
            </CardFooter>
            </form>
            </Form>
        </Card>
        
        {isGenerating && (
            <div className="text-center p-8 border rounded-lg animate-pulse">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-semibold">Generando análisis con IA...</p>
                <p className="text-muted-foreground">Este proceso puede tardar unos momentos.</p>
            </div>
        )}

        {analysisResult && (
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary"/>Insights Principales</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {analysisResult.principalInsights.map(insight => {
                           const Icon = {
                               'Target': Target,
                               'Users': Users,
                               'TrendingUp': TrendingUp,
                           }[insight.icon] || Target;
                           return <InsightCard key={insight.title} icon={Icon} title={insight.title} description={insight.description} confidence={insight.confidence} />
                       })}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/>Tendencias de Participación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {analysisResult.participationTrends.map(trend => (
                                 <ProgressBar 
                                    key={trend.week}
                                    label={trend.week}
                                    value={trend.value}
                                    colorClass={trend.isProjection ? 'bg-purple-500' : 'bg-primary'}
                                 />
                             ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary"/>Temas de Mayor Interés</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {analysisResult.keyTopics.map(topic => (
                                 <ProgressBar 
                                    key={topic.topic}
                                    label={topic.topic}
                                    value={topic.value}
                                    colorClass={topicColors[topic.color] || 'bg-primary'}
                                 />
                             ))}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary"/>Recomendaciones Estratégicas</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analysisResult.strategicRecommendations.map(rec => (
                            <RecommendationCard key={rec.title} {...rec} />
                        ))}
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  )
}
