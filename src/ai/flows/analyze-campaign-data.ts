'use server';

/**
 * @fileOverview An AI agent to analyze campaign data, identify trends, and discover new opportunities.
 *
 * - analyzeCampaignData - A function that analyzes campaign data using AI.
 * - AnalyzeCampaignDataInput - The input type for the analyzeCampaignData function.
 * - AnalyzeCampaignDataOutput - The return type for the analyzeCampaignData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCampaignDataInputSchema = z.object({
  campaignData: z.string().describe('Los datos de la campaña a analizar en formato JSON.'),
  campaignObjectives: z.string().describe('Los objetivos de la campaña.'),
});
export type AnalyzeCampaignDataInput = z.infer<typeof AnalyzeCampaignDataInputSchema>;

const AnalyzeCampaignDataOutputSchema = z.object({
  principalInsights: z.array(z.object({
    title: z.string().describe("El título del insight principal."),
    description: z.string().describe("Una descripción concisa del hallazgo."),
    confidence: z.number().min(0).max(100).describe("Un valor de 0 a 100 que representa el nivel de confianza en el insight."),
    icon: z.enum(['TrendingUp', 'Users', 'Target', 'Smile']).describe("El nombre de un ícono de lucide-react para representar el insight (ej: TrendingUp, Users, Target, Smile).")
  })).describe("Una lista de 4 insights principales y accionables derivados de los datos."),
  participationTrends: z.array(z.object({
    label: z.string().describe("La etiqueta para la tendencia, ej. 'Semana 1', 'Proyección S4'."),
    value: z.number().describe("El valor porcentual de la participación."),
    isProjection: z.boolean().describe("Indica si este dato es una proyección futura."),
  })).describe("Un análisis de las tendencias de participación semanal, incluyendo una proyección para la próxima semana."),
  interestTopics: z.array(z.object({
    topic: z.string().describe("El tema de interés, ej. 'Educación', 'Salud'."),
    value: z.number().describe("El valor porcentual de interés en el tema."),
  })).describe("Un análisis de los temas de mayor interés para los votantes, basado en sus datos demográficos y de sector."),
  recommendations: z.array(z.object({
    title: z.string().describe("El título conciso de la recomendación estratégica."),
    description: z.string().describe("Una descripción breve de la recomendación."),
    effort: z.enum(['Bajo', 'Medio', 'Alto']).describe("El nivel de esfuerzo requerido para implementar la recomendación."),
    impact: z.enum(['Bajo', 'Medio', 'Alto']).describe("El impacto potencial de la recomendación en la campaña."),
  })).describe("Una lista de recomendaciones estratégicas, cada una con su título, descripción, esfuerzo e impacto.")
});
export type AnalyzeCampaignDataOutput = z.infer<typeof AnalyzeCampaignDataOutputSchema>;

export async function analyzeCampaignData(input: AnalyzeCampaignDataInput): Promise<AnalyzeCampaignDataOutput> {
  return analyzeCampaignDataFlow(input);
}

const analyzeCampaignDataPrompt = ai.definePrompt({
  name: 'analyzeCampaignDataPrompt',
  input: {schema: AnalyzeCampaignDataInputSchema},
  output: {schema: AnalyzeCampaignDataOutputSchema},
  prompt: `Eres un experto analista de datos para campañas políticas. Tu idioma es el español.

  Analiza los siguientes datos de campaña y los objetivos. La campaña ya lleva 3 semanas en curso.

  - Datos de Campaña (JSON): {{{campaignData}}}
  - Objetivos: {{{campaignObjectives}}}

  Tu tarea es generar un análisis estructurado. Sigue estas instrucciones al pie de la letra:

  1.  **Insights Principales:**
      *   Genera 4 "insights" o hallazgos clave.
      *   Cada insight debe tener un 'title' (ej: "Perfil de Votante Objetivo"), una 'description' breve, un 'confidence' (nivel de confianza numérico entre 70 y 95), y un 'icon' (uno de estos: 'TrendingUp', 'Users', 'Target', 'Smile').
      *   Los insights deben ser variados y relevantes (ej: Mejor horario de contacto, Perfil del votante, Predicción de participación, Análisis de sentimiento).

  2.  **Tendencias de Participación:**
      *   Analiza los datos para inferir una tendencia de participación o crecimiento en las primeras 3 semanas.
      *   Crea 3 entradas para las semanas pasadas ('Semana 1', 'Semana 2', 'Semana 3') con valores porcentuales crecientes que simulen un progreso lógico.
      *   Crea 1 entrada para una proyección futura ('Proyección S4') con un valor porcentual que continúe la tendencia.
      *   Asegúrate de que 'isProjection' sea 'true' solo para la proyección.

  3.  **Temas de Mayor Interés:**
      *   Basándote en los datos de los votantes (sectores, demografía), deduce 4 temas de interés principales para ellos.
      *   Los temas deben ser relevantes para una campaña política en Latinoamérica (ej. 'Educación', 'Salud', 'Economía', 'Seguridad', 'Empleo', 'Medio Ambiente').
      *   Asigna porcentajes a cada tema. La suma no necesita ser 100%.

  4.  **Recomendaciones Estratégicas:**
      *   Genera 3 o 4 recomendaciones estratégicas accionables.
      *   Para cada una, provee un 'title' claro, una 'description' concisa, un nivel de 'effort' (Bajo, Medio, o Alto) y un nivel de 'impact' (Bajo, Medio, o Alto).

  Responde únicamente con el objeto JSON solicitado en el formato de salida. No incluyas explicaciones adicionales.
  `,
});

const analyzeCampaignDataFlow = ai.defineFlow(
  {
    name: 'analyzeCampaignDataFlow',
    inputSchema: AnalyzeCampaignDataInputSchema,
    outputSchema: AnalyzeCampaignDataOutputSchema,
  },
  async input => {
    const {output} = await analyzeCampaignDataPrompt(input);
    return output!;
  }
);
