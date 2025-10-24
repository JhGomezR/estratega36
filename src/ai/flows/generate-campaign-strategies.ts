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
  strategy: z.string().describe('A comprehensive and extremely detailed campaign strategy document, following the specified structure.'),
});
export type GenerateCampaignStrategyOutput = z.infer<typeof GenerateCampaignStrategyOutputSchema>;

// Tool for Section I: Diagnosis and Context
const generateDiagnosisSectionTool = ai.defineTool(
  {
    name: 'generateDiagnosisSection',
    description: `Genera la sección 'I. Diagnóstico y Contexto' de la estrategia. Debe ser extremadamente detallada, explicando el paso a paso. La sección debe cubrir:
- Tipo de Campaña: Personal, Corporativa, o Política. Define el tono, los canales y la Autenticidad Posicionada.
- Objetivo Principal: ¿Ganar una elección? ¿Lanzar un producto? ¿Mejorar la reputación? (Debe ser medible). Establece el "norte estratégico" y el foco de la Planeación.
- Entorno/Contexto: Situación política/social actual; temas clave de la agenda mediática y los intereses de los electores. Permite la Lectura Constante del Contexto y evita errores costosos.
- Oponente/Competencia: ¿Quiénes son los principales oponentes/competidores? (Fortalezas y debilidades). Base para el Análisis estratégico y la diferenciación del mensaje.`,
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
      const { text } = await ai.generate({
        prompt: `Basado en los siguientes datos:\n- Datos de campaña: ${input.campaignData}\n- Lugar: ${input.lugar}\n- Objetivos: ${input.objectives}\n- Restricciones: ${input.resourceConstraints}\n\nGenera un análisis extremadamente detallado para la sección "I. Diagnóstico y Contexto". Expande sobre cada uno de los puntos: Tipo de Campaña, Objetivo Principal, Entorno/Contexto y Oponente/Competencia. Sé exhaustivo y proporciona un análisis profundo.`,
      });
      return text;
  }
);

// Tool for Section II: Brand and Message
const generateBrandSectionTool = ai.defineTool(
  {
    name: 'generateBrandSection',
    description: `Genera la sección 'II. Marca y Mensaje' de la estrategia. Debe ser extremadamente detallada, explicando el paso a paso. La sección debe cubrir:
- Valores Fundamentales: 3 a 5 valores esenciales de la marca/candidato (el ADN único). Define la Coherencia de Marca Total y la Autenticidad Posicionada.
- Propuesta de Valor Central: ¿Qué solución concreta ofrece o qué causa defiende? ¿Qué lo hace único? Define el Mensaje Central y el eje de la campaña.
- Tono Deseado: ¿Serio y técnico, o cercano y emocional? (Para el Storytelling). Guía la Narrativa Emocional Segmentada y la Construcción de imagen.`,
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
      const { text } = await ai.generate({
        prompt: `Basado en los siguientes datos:\n- Datos de campaña: ${input.campaignData}\n- Objetivos: ${input.objectives}\n\nGenera un análisis extremadamente detallado para la sección "II. Marca y Mensaje". Expande sobre cada uno de los puntos: Valores Fundamentales, Propuesta de Valor Central y Tono Deseado. Sé exhaustivo y proporciona un análisis profundo.`,
      });
      return text;
  }
);

// Tool for Section III: Audience and Segmentation
const generateAudienceSectionTool = ai.defineTool(
  {
    name: 'generateAudienceSection',
    description: `Genera la sección 'III. Audiencia y Segmentación' de la estrategia. Debe ser extremadamente detallada, explicando el paso a paso. La sección debe cubrir:
- Audiencia Primaria: Demografía principal (Edad, ubicación, nivel socioeconómico) de la audiencia clave. Base para la Segmentación de mensajes y el Uso Estratégico de Microtargeting.
- Motivaciones de la Audiencia: ¿Qué les preocupa, qué necesitan, o qué sentimiento busca movilizar? Impulsa el Uso emocional de los mensajes y el Análisis del voto.`,
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
      const { text } = await ai.generate({
        prompt: `Basado en los siguientes datos:\n- Datos de campaña: ${input.campaignData}\n- Lugar: ${input.lugar}\n\nGenera un análisis extremadamente detallado para la sección "III. Audiencia y Segmentación". Expande sobre cada uno de los puntos: Audiencia Primaria y Motivaciones de la Audiencia. Sé exhaustivo y proporciona un análisis profundo y recomendaciones de microtargeting.`,
      });
      return text;
  }
);

// Tool for Section IV: Operation and Measurement
const generateOperationSectionTool = ai.defineTool(
  {
    name: 'generateOperationSection',
    description: `Genera la sección 'IV. Operación y Medición' de la estrategia. Debe ser extremadamente detallada, explicando el paso a paso. La sección debe cubrir:
- Recursos y Equipo: ¿El comando es centralizado o descentralizado? ¿Se cuenta con consultores/equipo multidisciplinario? Determina la viabilidad de la Gestión Profesional y la logística.
- Canales Actuales: ¿En qué redes sociales/medios ya tiene presencia y cuál es su alcance? Define la estrategia de Doble Presencia (Terreno y Redes) y el plan de Visibilidad.
- Indicadores Clave de Éxito: ¿Qué se va a medir para saber si se tiene éxito? (Ej. Conocimiento de marca, favorabilidad, ventas, % de voto). Fundamento para el Monitoreo electoral y la Gestión Data-Driven.`,
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
       const { text } = await ai.generate({
        prompt: `Basado en los siguientes datos:\n- Datos de campaña: ${input.campaignData}\n- Restricciones: ${input.resourceConstraints}\n\nGenera un análisis extremadamente detallado para la sección "IV. Operación y Medición". Expande sobre cada uno de los puntos: Recursos y Equipo, Canales Actuales e Indicadores Clave de Éxito. Sé exhaustivo y proporciona un análisis profundo y un plan de acción claro.`,
      });
      return text;
  }
);


export async function generateCampaignStrategy(
  input: GenerateCampaignStrategyInput
): Promise<GenerateCampaignStrategyOutput> {
  return generateCampaignStrategyFlow(input);
}

const generateCampaignStrategyPrompt = ai.definePrompt({
  name: 'generateCampaignStrategyPrompt',
  input: {schema: GenerateCampaignStrategyInputSchema},
  output: {schema: GenerateCampaignStrategyOutputSchema},
  tools: [
    generateDiagnosisSectionTool,
    generateBrandSectionTool,
    generateAudienceSectionTool,
    generateOperationSectionTool,
  ],
  prompt: `You are an expert political campaign strategist. Your task is to generate a complete and extremely detailed campaign strategy document based on the user's input. 

You must call the tools for each section in the correct order to build the document. Each section must be clearly titled and formatted. The final document should be comprehensive, well-structured, and provide deep insights.

1. Call 'generateDiagnosisSection'
2. Call 'generateBrandSection'
3. Call 'generateAudienceSection'
4. Call 'generateOperationSection'

Combine the outputs of all tools into a single, cohesive, and extremely detailed strategy document. Ensure the final text is well over 2500 words and formatted with clear headings for each of the four main sections.`,
});

const generateCampaignStrategyFlow = ai.defineFlow(
  {
    name: 'generateCampaignStrategyFlow',
    inputSchema: GenerateCampaignStrategyInputSchema,
    outputSchema: GenerateCampaignStrategyOutputSchema,
  },
  async input => {
    const { output } = await generateCampaignStrategyPrompt(input);
    return { strategy: output!.strategy };
  }
);
