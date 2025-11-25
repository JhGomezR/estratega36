
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeCampaignDataInputSchema = z.object({
  campaignName: z.string().describe('El nombre de la campaña.'),
  campaignGoal: z.string().describe('El objetivo principal de la campaña.'),
  voterCount: z.number().describe('El número total de votantes registrados para esta campaña.'),
  votersByCity: z.record(z.number()).describe('Un objeto que muestra el conteo de votantes por ciudad.'),
  votersBySector: z.record(z.number()).describe('Un objeto que muestra el conteo de votantes por sector laboral o demográfico.'),
});
export type AnalyzeCampaignDataInput = z.infer<typeof AnalyzeCampaignDataInputSchema>;

const AnalyzeCampaignDataOutputSchema = z.object({
  principalInsights: z.array(z.object({
    title: z.string().describe('El título conciso del insight. Ejemplo: "Perfil de Votante Objetivo"'),
    description: z.string().describe('Una descripción detallada del insight (2-3 frases).'),
    confidence: z.number().min(0).max(100).describe('Un nivel de confianza (0-100) en la validez del insight basado en los datos.'),
    icon: z.enum(['Target', 'Users', 'TrendingUp']).describe('El nombre de un ícono de lucide-react para representar el insight.'),
  })).min(4).max(6).describe('Una lista de entre 4 y 6 insights clave derivados de los datos.'),
  participationTrends: z.array(z.object({
    week: z.string().describe('El nombre de la semana o proyección. Ej: "Semana 1", "Proyección S4"'),
    value: z.number().describe('El valor porcentual de la participación (0-100).'),
    isProjection: z.boolean().describe('Indica si este dato es una proyección futura.')
  })).describe('Una lista de tendencias de participación semanales, incluyendo una proyección.'),
  keyTopics: z.array(z.object({
    topic: z.string().describe('El tema de interés. Ej: "Educación", "Salud"'),
    value: z.number().describe('El valor porcentual del interés en el tema (0-100).'),
    color: z.enum(['primary', 'green', 'orange', 'red']).describe('Un color para la barra de progreso del tema.')
  })).describe('Una lista de los 4 temas de mayor interés.'),
  strategicRecommendations: z.array(z.object({
    title: z.string().describe('Un título corto y accionable para la recomendación.'),
    description: z.string().describe('Una descripción detallada de la recomendación y su justificación.'),
    effort: z.enum(['Bajo', 'Medio', 'Alto']).describe('El nivel de esfuerzo estimado para implementar la recomendación.'),
    impact: z.enum(['Bajo', 'Medio', 'Alto']).describe('El impacto potencial de la recomendación en la campaña.'),
  })).length(2).describe('Una lista de exactamente 2 recomendaciones estratégicas clave.'),
});
export type AnalyzeCampaignDataOutput = z.infer<typeof AnalyzeCampaignDataOutputSchema>;


const analyzeCampaignPrompt = ai.definePrompt({
    name: 'analyzeCampaignPrompt',
    input: { schema: z.object({
        campaignName: z.string(),
        campaignGoal: z.string(),
        voterCount: z.number(),
        votersByCityJSON: z.string(),
        votersBySectorJSON: z.string(),
    }) },
    output: { schema: AnalyzeCampaignDataOutputSchema },
    prompt: `
        Eres un analista experto en campañas políticas. Tu tarea es analizar los datos proporcionados sobre una campaña y generar un resumen estructurado y visual en ESPAÑOL.

        Datos de Entrada:
        - Nombre de la Campaña: {{{campaignName}}}
        - Objetivo de la Campaña: {{{campaignGoal}}}
        - Votantes Totales: {{{voterCount}}}
        - Votantes por Ciudad: {{{votersByCityJSON}}}
        - Votantes por Sector: {{{votersBySectorJSON}}}

        Basado en estos datos, debes generar la siguiente estructura de salida:

        1.  **Principal Insights (entre 4 y 6 insights):**
            -   Identifica entre 4 y 6 hallazgos importantes de los datos.
            -   Para cada insight, provee un título, una descripción, un ícono ('Target', 'Users', o 'TrendingUp') y un nivel de confianza del 0 al 100.
            -   Ejemplo: Si una ciudad domina, un insight podría ser "Fuerte Concentración Geográfica".

        2.  **Participation Trends (3 semanas + 1 proyección):**
            -   Genera 3 valores de participación para las semanas pasadas y 1 valor proyectado para la siguiente.
            -   Los valores deben ser porcentajes entre 0 y 100.
            -   La proyección (isProjection: true) debe tener un valor ligeramente superior a la última semana.

        3.  **Key Topics (4 temas):**
            -   Genera los 4 temas de mayor interés basados en los datos de los votantes.
            -   Asigna un porcentaje a cada uno. La suma no tiene que ser 100.
            -   Asigna un color a cada tema: 'primary', 'green', 'orange', 'red'.

        4.  **Strategic Recommendations (2 recomendaciones):**
            -   Genera 2 recomendaciones estratégicas, concisas y accionables.
            -   Para cada una, incluye título, descripción, y una estimación de 'effort' (Bajo, Medio, Alto) e 'impact' (Bajo, Medio, Alto).

        IMPORTANTE: Toda la salida de texto (títulos, descripciones, etc.) debe estar en ESPAÑOL.
    `,
});

export const analyzeCampaignData = ai.defineFlow(
    {
        name: 'analyzeCampaignData',
        inputSchema: AnalyzeCampaignDataInputSchema,
        outputSchema: AnalyzeCampaignDataOutputSchema,
    },
    async (input) => {
        const { output } = await analyzeCampaignPrompt({
            ...input,
            votersByCityJSON: JSON.stringify(input.votersByCity),
            votersBySectorJSON: JSON.stringify(input.votersBySector),
        });
        return output!;
    }
);
