
'use server';

/**
 * @fileOverview Generates campaign strategies using AI based on provided data and objectives.
 * This version uses a single, structured JSON output to ensure a complete and detailed response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCampaignStrategyInputSchema = z.object({
  campaignData: z
    .string()
    .describe(
      'Data about the campaign, including past performance, voter demographics, and key issues.'
    ),
  lugar: z
    .string()
    .describe(
      'The city, region, or country where the campaign will take place.'
    ),
  objectives: z
    .string()
    .describe(
      'The objectives of the campaign, such as increasing voter turnout or winning a specific demographic.'
    ),
  resourceConstraints: z
    .string()
    .optional()
    .describe('Any limitations on resources, such as budget or staff.'),
});
export type GenerateCampaignStrategyInput = z.infer<
  typeof GenerateCampaignStrategyInputSchema
>;

const GenerateCampaignStrategyOutputSchema = z.object({
  diagnostico: z.string().describe('Sección I: Diagnóstico y Contexto'),
  marca: z.string().describe('Sección II: Marca y Mensaje'),
  audiencia: z.string().describe('Sección III: Audiencia y Segmentación'),
  operacion: z.string().describe('Sección IV: Operación y Medición'),
  consistencia: z.string().describe('Sección V: Estrategia de Constancia y Consistencia'),
  microtargeting: z.string().describe('Sección VI: Estrategia de Uso Estratégico de Microtargeting'),
  recomendaciones: z.string().describe('Sección VII: Recomendaciones Clave'),
  riesgos: z.string().describe('Sección VIII: Riesgos Potenciales'),
});
export type GenerateCampaignStrategyOutput = z.infer<
  typeof GenerateCampaignStrategyOutputSchema
>;

const generateCampaignStrategyPrompt = ai.definePrompt({
  name: 'generateCampaignStrategyPrompt',
  input: { schema: GenerateCampaignStrategyInputSchema },
  output: { schema: GenerateCampaignStrategyOutputSchema },
  prompt: `You are an expert political campaign strategist. Your task is to generate a complete and extremely detailed eight-part campaign strategy document. It must be extremely detailed, with each section being comprehensive and thorough.

Based on the following user input, generate the full strategy and return it as a structured JSON object with the keys: "diagnostico", "marca", "audiencia", "operacion", "consistencia", "microtargeting", "recomendaciones", "riesgos".

- Campaign Data: {{{campaignData}}}
- Location: {{{lugar}}}
- Objectives: {{{objectives}}}
- Resource Constraints: {{{resourceConstraints}}}

For each of the 8 sections, provide a deep, detailed, and step-by-step analysis following the structure below. Be extremely detailed in each subsection.

I. Diagnóstico y Contexto
- Tipo de Campaña: Personal, Corporativa, o Política. Define el tono, los canales y la Autenticidad Posicionada.
- Objetivo Principal: ¿Ganar una elección? ¿Lanzar un producto? ¿Mejorar la reputación? (Debe ser medible). Establece el "norte estratégico" y el foco de la Planeación.
- Entorno/Contexto: Situación política/social actual; temas clave de la agenda mediática y los intereses de los electores. Permite la Lectura Constante del Contexto y evita errores costosos.
- Oponente/Competencia: ¿Quiénes son los principales oponentes/competidores? (Fortalezas y debilidades). Base para el Análisis estratégico y la diferenciación del mensaje.

II. Marca y Mensaje
- Valores Fundamentales: 3 a 5 valores esenciales de la marca/candidato (el ADN único). Define la Coherencia de Marca Total y la Autenticidad Posicionada.
- Propuesta de Valor Central: ¿Qué solución concreta ofrece o qué causa defiende? ¿Qué lo hace único? Define el Mensaje Central y el eje de la campaña.
- Tono Deseado: ¿Serio y técnico, o cercano y emocional? (Para el Storytelling). Guía la Narrativa Emocional Segmentada y la Construcción de imagen.

III. Audiencia y Segmentación
- Audiencia Primaria: Demografía principal (Edad, ubicación, nivel socioeconómico) de la audiencia clave. Base para la Segmentación de mensajes y el Uso Estratégico de Microtargeting.
- Motivaciones de la Audiencia: ¿Qué les preocupa, qué necesitan, o qué sentimiento busca movilizar? Impulsa el Uso emocional de los mensajes y el Análisis del voto.

IV. Operación y Medición
- Recursos y Equipo: ¿El comando es centralizado o descentralizado? ¿Se cuenta con consultores/equipo multidisciplinario? Determina la viabilidad de la Gestión Profesional y la logística.
- Canales Actuales: ¿En qué redes sociales/medios ya tiene presencia y cuál es su alcance? Define la estrategia de Doble Presencia (Terreno y Redes) y el plan de Visibilidad.
- Indicadores Clave de Éxito: ¿Qué se va a medir para saber si se tiene éxito? (Ej. Conocimiento de marca, favorabilidad, ventas, % de voto). Fundamento para el Monitoreo electoral y la Gestión Data-Driven.

V. Estrategia de Constancia y Consistencia
- Frecuencia y Ritmo: Define la cadencia de comunicación y eventos.
- Unidad y Coherencia: Asegura que todos los mensajes y acciones estén alineados.

VI. Estrategia de Uso Estratégico de Microtargeting
- Implementación de Data y Adaptación Fina: Cómo usar los datos para personalizar la comunicación a nivel micro.
- Eficiencia: Cómo medir el ROI de las acciones de microtargeting.

VII. Recomendaciones Clave
- Priorizar el Personal Local
- Sensibilidad Cultural Inquebrantable
- Inversión en Logística de Infraestructura
- Enfoque en Promesas Tangibles
- Mecanismo de GOTV Robusto

VIII. Riesgos Potenciales
- Riesgo Logístico y de Seguridad
- Errores Culturales / Desconfianza Externa
- Apatía del Votante / Fatiga
- Competencia con Líderes Locales
`,
});

const generateCampaignStrategyFlow = ai.defineFlow(
  {
    name: 'generateCampaignStrategyFlow',
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: GenerateCampaignStrategyOutputSchema,
  },
  async (input) => {
    const { output } = await generateCampaignStrategyPrompt(input);
    return output!;
  }
);


export async function generateCampaignStrategy(input: GenerateCampaignStrategyInput): Promise<GenerateCampaignStrategyOutput> {
    return await generateCampaignStrategyFlow(input);
}
