
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
  saveGeneratedStrategy,
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
import { Lightbulb, Loader2, CheckCircle, AlertTriangle, Info, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import type { Campaign } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Skeleton } from './ui/skeleton'

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
  campaignId: z.string({ required_error: 'Debe seleccionar una campaña.' }),
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

interface StrategiesClientProps {
  campaigns: Campaign[];
  isLoading: boolean;
}


export function StrategiesClient({ campaigns, isLoading }: StrategiesClientProps) {
  const [strategy, setStrategy] = useState<StrategyResult>({})
  const [formValues, setFormValues] = useState<z.infer<typeof formSchema> | null>(null);
  const [isOverallGenerating, setIsOverallGenerating] = useState(false)
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>(initialSectionStatus)
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campaignData: '',
      lugar: '',
      objectives: '',
      resourceConstraints: '',
      campaignId: undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsOverallGenerating(true);
    setStrategy({});
    setSectionStatus(initialSectionStatus);
    setFormValues(values);
    
    const generatedOutputs: StrategyResult = {};

    for (const key of sectionKeys) {
        setSectionStatus(prev => ({ ...prev, [key]: 'loading' }));
        try {
            const result = await generationFunctions[key](values);
            generatedOutputs[key] = result;
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

  const handleSaveStrategy = async () => {
    if (!formValues || Object.keys(strategy).length !== sectionKeys.length) {
      toast({
        variant: "destructive",
        title: "Estrategia Incompleta",
        description: "No se puede guardar una estrategia incompleta o con errores.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { campaignId, ...inputs } = formValues;
      const result = await saveGeneratedStrategy({
        campaignId,
        inputs,
        outputs: strategy as Record<SectionKey, string>,
      });

      if (result.success) {
        toast({
          title: "Estrategia Guardada",
          description: "La estrategia completa ha sido guardada en la base de datos.",
          action: <Save className="h-5 w-5" />,
        });
      } else {
        throw new Error("El guardado falló en el servidor.");
      }
    } catch (e) {
      console.error("Error saving strategy:", e);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar la estrategia. Inténtalo de nuevo.",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const hasStarted = isOverallGenerating || Object.values(strategy).some(v => v);
  const isComplete = Object.values(sectionStatus).every(s => s === 'completed');

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
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaña Activa</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoading ? "Cargando campañas..." : "Selecciona una campaña"} />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormDescription>La estrategia generada se asociará a esta campaña.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
             <CardHeader>
                {isOverallGenerating && (
                    <div className="p-4 border-b text-sm text-muted-foreground flex items-center gap-2 mb-4 rounded-lg bg-muted/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando estrategia... Este proceso puede tardar hasta 2 minutos. Por favor, no cierres esta ventana.
                    </div>
                )}
                 {isComplete && (
                   <div className="flex items-center justify-between">
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Revisa y Guarda tu Estrategia</AlertTitle>
                        <AlertDescription>
                            El contenido ha sido generado. Revísalo y guárdalo para el historial de tu campaña.
                        </AlertDescription>
                    </Alert>
                     <Button onClick={handleSaveStrategy} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar
                    </Button>
                   </div>
                 )}
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
                         {sectionStatus[key] === 'idle' && <Skeleton className="h-20 w-full" />}
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

    