
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  generateDiagnosticoSection,
  generateMarcaSection,
  generateAudienciaSection,
  generateOperacionSection,
  generateConsistenciaSection,
  generateMicrotargetingSection,
  generateRecomendacionesSection,
  generateRiesgosSection,
} from '@/ai/flows/generate-campaign-strategies'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Lightbulb, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

const formSchema = z.object({
  campaignData: z.string().min(50, {
    message: 'Los datos de la campaña deben tener al menos 50 caracteres.',
  }),
  lugar: z.string().min(3, {
    message: 'El lugar debe tener al menos 3 caracteres.',
  }),
  objectives: z.string().min(20, {
    message: 'Los objetivos de la campaña deben tener al menos 20 caracteres.',
  }),
  resourceConstraints: z.string().optional(),
})

type SectionKey =
  | 'diagnostico'
  | 'marca'
  | 'audiencia'
  | 'operacion'
  | 'consistencia'
  | 'microtargeting'
  | 'recomendaciones'
  | 'riesgos'

const sectionTitles: Record<SectionKey, string> = {
  diagnostico: 'I. Diagnóstico y Contexto',
  marca: 'II. Marca y Mensaje',
  audiencia: 'III. Audiencia y Segmentación',
  operacion: 'IV. Operación y Medición',
  consistencia: 'V. Estrategia de Constancia y Consistencia',
  microtargeting: 'VI. Estrategia de Uso Estratégico de Microtargeting',
  recomendaciones: 'VII. Recomendaciones Clave',
  riesgos: 'VIII. Riesgos Potenciales',
}

const generationFunctions: Record<SectionKey, (input: z.infer<typeof formSchema>) => Promise<string>> = {
    diagnostico: generateDiagnosticoSection,
    marca: generateMarcaSection,
    audiencia: generateAudienciaSection,
    operacion: generateOperacionSection,
    consistencia: generateConsistenciaSection,
    microtargeting: generateMicrotargetingSection,
    recomendaciones: generateRecomendacionesSection,
    riesgos: generateRiesgosSection,
}

type StrategyResult = Partial<Record<SectionKey, string>>
type GenerationStatus = 'idle' | 'loading' | 'completed' | 'error'
type SectionStatus = Record<SectionKey, GenerationStatus>

const sectionKeys = Object.keys(sectionTitles) as SectionKey[];

const initialSectionStatus = sectionKeys.reduce((acc, key) => {
  acc[key] = 'idle'
  return acc
}, {} as SectionStatus)

export function StrategiesClient() {
  const [strategy, setStrategy] = useState<StrategyResult>({})
  const [isOverallGenerating, setIsOverallGenerating] = useState(false)
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>(initialSectionStatus)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campaignData: 'Carlos Ardila a la Camara por el departamento del putumayo, ya hasido 2 veces electo',
      lugar: 'Putumayo',
      objectives: 'Aumentar y generar la mayor cantidad de votos posibles',
      resourceConstraints: 'presupuesto reducido',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsOverallGenerating(true)
    setStrategy({})
    setSectionStatus(initialSectionStatus)
    form.reset({
        campaignData: '',
        lugar: '',
        objectives: '',
        resourceConstraints: ''
    });

    for (const key of sectionKeys) {
        setSectionStatus(prev => ({ ...prev, [key]: 'loading' }));
        try {
            const result = await generationFunctions[key](values);
            setStrategy(prev => ({ ...prev, [key]: result }));
            setSectionStatus(prev => ({ ...prev, [key]: 'completed' }));
        } catch (e: any) {
            console.error(`Error generating section ${key}:`, e);
            const errorMessage = `Error al generar esta sección. Por favor, revisa la consola para más detalles.`;
            setStrategy(prev => ({ ...prev, [key]: errorMessage }));
            setSectionStatus(prev => ({ ...prev, [key]: 'error' }));
            toast({
                variant: 'destructive',
                title: `Error en Sección: ${sectionTitles[key]}`,
                description: 'No se pudo generar esta parte de la estrategia.',
            });
            setIsOverallGenerating(false);
            return;
        }
    }
    
    setIsOverallGenerating(false);
  }

  const hasStarted = isOverallGenerating || Object.values(strategy).some(v => v);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Generador de Estrategias</CardTitle>
              <CardDescription>
                Define los parámetros para que la IA genere una estrategia de campaña.
              </CardDescription>
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
                    <FormDescription>
                      La ciudad, región o país donde se desarrollará la campaña.
                    </FormDescription>
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
              <Button type="submit" disabled={isOverallGenerating} className="w-48">
                {isOverallGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lightbulb className="mr-2 h-4 w-4" />
                )}
                {isOverallGenerating ? 'Generando...' : 'Generar Estrategia'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <div className="space-y-4">
        {hasStarted ? (
          <Card className="bg-card/80 border-primary/50 shadow-lg">
             {isOverallGenerating && (
                <div className="p-4 border-b text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando estrategia... Este proceso puede tardar hasta 2 minutos. Por favor, no cierres esta ventana.
                </div>
               )}
             <CardHeader>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Contenido Generado por IA</AlertTitle>
                    <AlertDescription>
                        Este contenido es una base generada por inteligencia artificial. Recuerda revisarlo y ajustarlo a tus necesidades.
                    </AlertDescription>
                </Alert>
                <CardTitle className="pt-4">Estrategia de Campaña Generada</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] w-full">
                <div className="space-y-6 pr-4">
                  {sectionKeys.map(key => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold">{sectionTitles[key]}</h3>
                        {sectionStatus[key] === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        {sectionStatus[key] === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {sectionStatus[key] === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                      </div>

                      <div className="text-sm whitespace-pre-wrap text-muted-foreground p-4 border rounded-md min-h-[50px] bg-muted/20">
                         {sectionStatus[key] === 'loading' && <p>Generando esta sección...</p>}
                         {strategy[key] && <p>{strategy[key]}</p>}
                      </div>

                      <Separator className="mt-6" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[400px]">
            <Lightbulb className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Estrategia de Campaña</h3>
            <p className="text-muted-foreground text-sm">
              La estrategia generada por la IA aparecerá aquí, sección por sección.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
