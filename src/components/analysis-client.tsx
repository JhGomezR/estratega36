'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { analyzeCampaignData, type AnalyzeCampaignDataOutput } from '@/ai/flows/analyze-campaign-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const formSchema = z.object({
  campaignData: z.string().min(50, {
    message: 'Los datos de la campaña deben tener al menos 50 caracteres.',
  }),
  campaignObjectives: z.string().min(20, {
    message: 'Los objetivos de la campaña deben tener al menos 20 caracteres.',
  }),
})

export function AnalysisClient() {
  const [result, setResult] = useState<AnalyzeCampaignDataOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campaignData: '',
      campaignObjectives: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setResult(null)
    try {
      const aiResult = await analyzeCampaignData(values)
      setResult(aiResult)
    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Error de Análisis',
        description: 'No se pudo completar el análisis. Por favor, inténtalo de nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Datos de la Campaña</CardTitle>
              <CardDescription>Ingresa los datos y objetivos de tu campaña para que la IA los analice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="campaignData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datos de la Campaña</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Pega aquí los datos de tu campaña (ej. demografía, resultados pasados, interacciones, etc.)"
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Proporciona la mayor cantidad de datos posible para un análisis más preciso.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="campaignObjectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos de la Campaña</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe los objetivos principales (ej. aumentar el voto en un 15%, ganar el segmento de 18-25 años)."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BrainCircuit className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Analizando...' : 'Analizar con IA'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <div className="space-y-4">
        {isLoading && (
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
            <Card className="bg-card/80 border-primary/50 shadow-lg">
              <CardHeader>
                <CardTitle>Tendencias Clave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.keyTrends}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-primary/50 shadow-lg">
              <CardHeader>
                <CardTitle>Nuevas Oportunidades</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.newOpportunities}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/80 border-accent/50 shadow-lg">
              <CardHeader>
                <CardTitle>Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.recommendations}</p>
              </CardContent>
            </Card>
          </>
        )}
        {!isLoading && !result && (
             <Card className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[400px]">
                <BrainCircuit className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Resultados del Análisis</h3>
                <p className="text-muted-foreground text-sm">
                    Los resultados de tu análisis de campaña aparecerán aquí.
                </p>
            </Card>
        )}
      </div>
    </div>
  )
}
