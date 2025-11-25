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
  })).length(3).describe('Una lista de exactamente 3 insights clave derivados de los datos.'),
  participationTrends: z.array(z.object({
    city: z.string().describe('El nombre de la ciudad.'),
    voters: z.number().describe('El número de votantes en esa ciudad.'),
  })).describe('Una lista de las 5 ciudades con más votantes.'),
  keyTopics: z.array(z.object({
    topic: z.string().describe('El sector o tema de interés.'),
    interest: z.number().describe('El número de votantes en ese sector.'),
  })).describe('Una lista de los 5 sectores con más votantes.'),
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
        Eres un analista experto en campañas políticas. Tu tarea es analizar los datos proporcionados sobre una campaña y generar un resumen estructurado en ESPAÑOL.

        Datos de Entrada:
        - Nombre de la Campaña: {{{campaignName}}}
        - Objetivo de la Campaña: {{{campaignGoal}}}
        - Votantes Totales: {{{voterCount}}}
        - Votantes por Ciudad: {{{votersByCityJSON}}}
        - Votantes por Sector: {{{votersBySectorJSON}}}

        Basado en estos datos, debes generar la siguiente estructura de salida:

        1.  **Principal Insights (3 insights):**
            -   Identifica los 3 hallazgos más importantes de los datos.
            -   Para cada insight, provee un título, una descripción, un ícono ('Target', 'Users', o 'TrendingUp') y un nivel de confianza del 0 al 100.
            -   Ejemplo de insight: Si una ciudad domina, un insight podría ser "Fuerte Concentración Geográfica" con el ícono 'Target'.

        2.  **Participation Trends (Top 5 ciudades):**
            -   Extrae las 5 ciudades con mayor número de votantes del objeto 'votersByCity'.
            -   Formatea la salida como un array de objetos, donde cada objeto tiene 'city' y 'voters'.

        3.  **Key Topics (Top 5 sectores):**
            -   Extrae los 5 sectores con mayor número de votantes del objeto 'votersBySector'.
            -   Formatea la salida como un array de objetos, donde cada objeto tiene 'topic' e 'interest'.

        4.  **Strategic Recommendations (2 recomendaciones):**
            -   Basado en TODO el análisis, genera 2 recomendaciones estratégicas, concisas y accionables.
            -   Para cada una, incluye título, descripción, y una estimación de 'effort' (Bajo, Medio, Alto) e 'impact' (Bajo, Medio, Alto).
            -   Ejemplo: Si el sector 'Agroindustria' es grande, una recomendación podría ser "Lanzar Iniciativa para el Agro".

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
