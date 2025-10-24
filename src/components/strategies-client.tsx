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
  type GenerateCampaignStrategyInput,
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
import { Lightbulb, Loader2, Info, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Separator } from './ui/separator'

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

type SectionKey = 
  | 'diagnostico' 
  | 'marca' 
  | 'audiencia' 
  | 'operacion' 
  | 'consistencia' 
  | 'microtargeting' 
  | 'recomendaciones' 
  | 'riesgos';

const sectionTitles: Record<SectionKey, string> = {
  diagnostico: 'I. Diagnóstico y Contexto',
  marca: 'II. Marca y Mensaje',
  audiencia: 'III. Audiencia y Segmentación',
  operacion: 'IV. Operación y Medición',
  consistencia: 'V. Estrategia de Constancia y Consistencia',
  microtargeting: 'VI. Estrategia de Uso Estratégico de Microtargeting',
  recomendaciones: 'VII. Recomendaciones Clave',
  riesgos: 'VIII. Riesgos Potenciales',
};

const generationFunctions: Record<SectionKey, (input: GenerateCampaignStrategyInput) => Promise<string>> = {
  diagnostico: generateDiagnosticoSection,
  marca: generateMarcaSection,
  audiencia: generateAudienciaSection,
  operacion: generateOperacionSection,
  consistencia: generateConsistenciaSection,
  microtargeting: generateMicrotargetingSection,
  recomendaciones: generateRecomendacionesSection,
  riesgos: generateRiesgosSection,
};

type StrategyResult = Partial<Record<SectionKey, string>>;
type GenerationStatus = 'idle' | 'loading' | 'completed' | 'error';
type SectionStatus = Record<SectionKey, GenerationStatus>;

export function StrategiesClient() {
  const [strategy, setStrategy] = useState<StrategyResult>({})
  const [isOverallGenerating, setIsOverallGenerating] = useState(false)
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>(
      Object.keys(sectionTitles).reduce((acc, key) => {
          acc[key as SectionKey] = 'idle';
          return acc;
      }, {} as SectionStatus)
  );
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
    setIsOverallGenerating(true)
    setStrategy({})
    setSectionStatus(
        Object.keys(sectionTitles).reduce((acc, key) => {
            acc[key as SectionKey] = 'idle';
            return acc;
        }, {} as SectionStatus)
    );

    const sectionKeys = Object.keys(generationFunctions) as SectionKey[];

    for (const key of sectionKeys) {
      setSectionStatus(prev => ({ ...prev, [key]: 'loading' }));
      try {
        const result = await generationFunctions[key](values);
        setStrategy(prev => ({ ...prev, [key]: result }));
        setSectionStatus(prev => ({ ...prev, [key]: 'completed' }));
      } catch (e) {
        console.error(`Error generating section ${key}:`, e);
        setStrategy(prev => ({ ...prev, [key]: `Error al generar esta sección.` }));
        setSectionStatus(prev => ({ ...prev, [key]: 'error' }));
        toast({
          variant: 'destructive',
          title: `Error en Sección: ${sectionTitles[key]}`,
          description: 'No se pudo generar esta parte de la estrategia. Inténtalo de nuevo.',
        })
      }
    }
    setIsOverallGenerating(false)
  }

  const hasResults = Object.keys(strategy).length > 0;

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
              <Button type="submit" disabled={isOverallGenerating}>
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
        {hasResults ? (
          <Card className="bg-card/80 border-primary/50 shadow-lg">
            <CardHeader className="space-y-4">
              <CardTitle>Estrategia de Campaña Generada</CardTitle>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Nota Importante</AlertTitle>
                <AlertDescription>
                  Este es un modelo de estrategia generado por IA. Debe ser
                  utilizado como una base o un ejemplo para desarrollar tu plan
                  final. Revisa y ajusta el contenido según tu criterio y
                  conocimiento experto.
                </AlertDescription>
              </Alert>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[70vh] w-full">
                <div className="space-y-6 pr-4">
                  {(Object.keys(sectionTitles) as SectionKey[]).map(key => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold">{sectionTitles[key]}</h3>
                         {sectionStatus[key] === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                         {sectionStatus[key] === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                         {sectionStatus[key] === 'error' && <CheckCircle className="h-5 w-5 text-red-500" />}
                      </div>
                      
                       {strategy[key] && (
                        <p className="text-sm whitespace-pre-wrap">{strategy[key]}</p>
                       )}
                       {sectionStatus[key] === 'loading' && (
                         <p className="text-sm text-muted-foreground">Generando esta sección...</p>
                       )}

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
