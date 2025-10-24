'use server';

/**
 * @fileOverview Generates campaign strategies using AI based on provided data and objectives.
 *
 * - generateCampaignStrategy - A function that generates a campaign strategy.
 * - GenerateCampaignStrategyInput - The input type for the generateCampaignStrategy function.
 * - GenerateCampaignStrategyOutput - The return type for the generateCampaignStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCampaignStrategyInputSchema = z.object({
  campaignData:
    z.string().describe('Data about the campaign, including past performance, voter demographics, and key issues.'),
  lugar: z.string().describe('The city, region, or country where the campaign will take place.'),
  objectives: z.string().describe('The objectives of the campaign, such as increasing voter turnout or winning a specific demographic.'),
  resourceConstraints:
    z.string().optional().describe('Any limitations on resources, such as budget or staff.'),
});
export type GenerateCampaignStrategyInput = z.infer<typeof GenerateCampaignStrategyInputSchema>;

const GenerateCampaignStrategyOutputSchema = z.object({
  strategy: z.string().describe('A comprehensive and extremely detailed campaign strategy document, up to 5000 words, following the specified structure.'),
});
export type GenerateCampaignStrategyOutput = z.infer<typeof GenerateCampaignStrategyOutputSchema>;

export async function generateCampaignStrategy(
  input: GenerateCampaignStrategyInput
): Promise<GenerateCampaignStrategyOutput> {
  return generateCampaignStrategyFlow(input);
}

const generateCampaignStrategyPrompt = ai.definePrompt({
  name: 'generateCampaignStrategyPrompt',
  input: {schema: GenerateCampaignStrategyInputSchema},
  output: {schema: GenerateCampaignStrategyOutputSchema},
  
  prompt: `Vas a recibir 5 parametros;
Datos clave de la campaña: {{{campaignData}}}
Lugar: {{{lugar}}}
Objetivos Principales: {{{objectives}}}
Restricciones de Recursos (Opcional): {{{resourceConstraints}}}

y con base en esos datos tu vas a generar un modelo de campaña que cumpla con los siguientes requisitos en ese debido orden, debe ser extremadamente detallada, debe llegar hasta las 5000 palabras:

I. Diagnóstico y Contexto
Tipo de Campaña: Personal, Corporativa, o Política. Define el tono, los canales y la Autenticidad Posicionada.
Objetivo Principal: ¿Ganar una elección? ¿Lanzar un producto? ¿Mejorar la reputación? (Debe ser medible). Establece el "norte estratégico" y el foco de la Planeación.
Entorno/Contexto: Situación política/social actual; temas clave de la agenda mediática y los intereses de los electores. Permite la Lectura Constante del Contexto y evita errores costosos.
Oponente/Competencia: ¿Quiénes son los principales oponentes/competidores? (Fortalezas y debilidades). Base para el Análisis estratégico y la diferenciación del mensaje.

II. Marca y Mensaje
Valores Fundamentales: 3 a 5 valores esenciales de la marca/candidato (el ADN único). Define la Coherencia de Marca Total y la Autenticidad Posicionada.
Propuesta de Valor Central: ¿Qué solución concreta ofrece o qué causa defiende? ¿Qué lo hace único? Define el Mensaje Central y el eje de la campaña.
Tono Deseado: ¿Serio y técnico, o cercano y emocional? (Para el Storytelling). Guía la Narrativa Emocional Segmentada y la Construcción de imagen.

III. Audiencia y Segmentación
Audiencia Primaria: Demografía principal (Edad, ubicación, nivel socioeconómico) de la audiencia clave. Base para la Segmentación de mensajes y el Uso Estratégico de Microtargeting.
Motivaciones de la Audiencia: ¿Qué les preocupa, qué necesitan, o qué sentimiento busca movilizar? Impulsa el Uso emocional de los mensajes y el Análisis del voto.

IV. Operación y Medición
Recursos y Equipo: ¿El comando es centralizado o descentralizado? ¿Se cuenta con consultores/equipo multidisciplinario? Determina la viabilidad de la Gestión Profesional y la logística.
Canales Actuales: ¿En qué redes sociales/medios ya tiene presencia y cuál es su alcance? Define la estrategia de Doble Presencia (Terreno y Redes) y el plan de Visibilidad.
Indicadores Clave de Éxito: ¿Qué se va a medir para saber si se tiene éxito? (Ej. Conocimiento de marca, favorabilidad, ventas, % de voto). Fundamento para el Monitoreo electoral y la Gestión Data-Driven.
`,
});

const generateCampaignStrategyFlow = ai.defineFlow(
  {
    name: 'generateCampaignStrategyFlow',
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: GenerateCampaignStrategyOutputSchema,
  },
  async input => {
    const {output} = await generateCampaignStrategyPrompt(input);
    // The entire detailed document will be in the 'strategy' field of the output.
    return { strategy: output!.strategy };
  }
);
