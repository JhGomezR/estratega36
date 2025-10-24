
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { generateCampaignStrategy } from '@/ai/flows/generate-campaign-strategies'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Lightbulb, Loader2, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { readStreamableValue } from 'ai/rsc'

const formSchema = z.object({
  campaignData: z.string().min(50, {
    message: 'Los datos de la campaña deben tener al menos 50 caracteres.',
  }),
  lugar: z.string().min(3, {
    message: 'El lugar debe tener al menos 3 caracteres.',
  }),
  objectives: z.string().min(20, {
    message: 'Los objetivos deben tener al menos 20 caracteres.',
  }),
  resourceConstraints: z.string().optional(),
})

export function StrategiesClient() {
  const [strategy, setStrategy] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campaignData: '',
      lugar: '',
      objectives: '',
      resourceConstraints: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setStrategy('')
    try {
      const stream = await generateCampaignStrategy(values);

      for await (const chunk of readStreamableValue(stream)) {
        setStrategy((prev) => prev + (chunk ?? ''));
      }

    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Error de Generación',
        description: 'No se pudo generar la estrategia. Por favor, inténtalo de nuevo.',
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
              <CardTitle>Generador de Estrategias</CardTitle>
              <CardDescription>Define los parámetros para que la IA genere una estrategia de campaña.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="campaignData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datos Clave de la Campaña</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Resumen del rendimiento pasado, demografía de votantes, temas clave..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lugar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Colombia, Bogotá, etc." {...field} />
                    </FormControl>
                    <FormDescription>La ciudad, región o país donde se desarrollará la campaña.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos Principales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Aumentar la participación electoral, ganar un distrito específico, mejorar la imagen del candidato."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resourceConstraints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restricciones de Recursos (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Presupuesto limitado, poco personal de campo." {...field} />
                    </FormControl>
                    <FormDescription>
                      Cualquier limitación que la IA deba considerar.
                    </FormDescription>
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
                  <Lightbulb className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Generando...' : 'Generar Estrategia'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <div className="space-y-4">
        {isLoading && !strategy && (
             <Card className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[400px]">
                <Loader2 className="h-16 w-16 text-muted-foreground/50 mb-4 animate-spin" />
                <h3 className="text-lg font-semibold">Generando tu modelo de estrategia...</h3>
                <p className="text-muted-foreground text-sm mt-2">
                    Esto puede tomar hasta 2 minutos. Gracias por tu paciencia.
                </p>
            </Card>
        )}
        {!isLoading && !strategy && (
             <Card className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[400px]">
                <Lightbulb className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Estrategia de Campaña</h3>
                <p className="text-muted-foreground text-sm">
                    La estrategia generada por la IA aparecerá aquí en tiempo real.
                </p>
            </Card>
        )}
        {strategy && (
          <>
            <Card className="bg-card/80 border-primary/50 shadow-lg">
              <CardHeader className="space-y-4">
                <CardTitle>Estrategia de Campaña Generada</CardTitle>
                 <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Nota Importante</AlertTitle>
                  <AlertDescription>
                    Este es un modelo de estrategia generado por IA. Debe ser utilizado como una base o un ejemplo para desarrollar tu plan final. Revisa y ajusta el contenido según tu criterio y conocimiento experto.
                  </AlertDescription>
                </Alert>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh] w-full">
                  <p className="text-sm whitespace-pre-wrap pr-4">{strategy}{isLoading && '...'}</p>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
