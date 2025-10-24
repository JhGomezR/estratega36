
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

// Tool for Step 1: Estrategia de Autenticidad Posicionada
const generateAuthenticityStrategyTool = ai.defineTool(
  {
    name: 'generateAuthenticityStrategy',
    description: `Genera la sección 'Paso 1: Estrategia de Autenticidad Posicionada'. El objetivo es definir el ADN Único que conecte la visión global del candidato con las necesidades locales. Debe cubrir los subpuntos:
- Definición del ADN Único: Detalla los valores, la historia y la visión del candidato.
- Alineación con la Oferta: Explica cómo este ADN se traduce en propuestas concretas y relevantes para el 'lugar' especificado.`,
    inputSchema: z.object({
      campaignData: z.string(),
      lugar: z.string(),
      objectives: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // This tool now only structures the request, the main prompt will do the generation.
    return `Sección 1: Estrategia de Autenticidad Posicionada. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

// Tool for Step 2: Estrategia de Narrativa Emocional Segmentada
const generateNarrativeStrategyTool = ai.defineTool(
  {
    name: 'generateNarrativeStrategy',
    description: `Genera la sección 'Paso 2: Estrategia de Narrativa Emocional Segmentada'. El objetivo es crear mensajes que movilicen a las personas, adaptados a cada subgrupo. Debe cubrir:
- Creación de la Narrativa: Desarrolla la historia principal de la campaña.
- Segmentación y Adaptación: Detalla cómo se adaptará esta narrativa para diferentes audiencias identificadas en los datos.`,
    inputSchema: z.object({
      campaignData: z.string(),
      objectives: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Sección 2: Estrategia de Narrativa Emocional Segmentada. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

// Tool for Step 3: Estrategia de Gestión Profesional y Data-Driven
const generateManagementStrategyTool = ai.defineTool(
  {
    name: 'generateManagementStrategy',
    description: `Genera la sección 'Paso 3: Estrategia de Gestión Profesional y Data-Driven'. El objetivo es asegurar una ejecución eficiente y basada en datos. Debe cubrir:
- Estructura y Gerenciamiento: Propone una estructura de equipo y un modelo de gestión.
- Medición y Decisión: Define los KPIs clave y cómo se usarán para tomar decisiones.`,
    inputSchema: z.object({
      resourceConstraints: z.string().optional(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Sección 3: Estrategia de Gestión Profesional y Data-Driven. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

// Tool for Step 4: Estrategia de Lectura Constante del Contexto
const generateContextStrategyTool = ai.defineTool(
  {
    name: 'generateContextStrategy',
    description: `Genera la sección 'Paso 4: Estrategia de Lectura Constante del Contexto'. El objetivo es mantener la campaña relevante, reaccionando a la agenda. Debe cubrir:
- Monitoreo de la Agenda: Describe cómo se seguirán los medios y la opinión pública.
- Reacción y Relevancia: Detalla el proceso para responder rápidamente y ajustar el mensaje.`,
    inputSchema: z.object({
      campaignData: z.string(),
      lugar: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Sección 4: Estrategia de Lectura Constante del Contexto. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

// Tool for Step 5: Estrategia de Constancia y Consistencia
const generateConsistencyStrategyTool = ai.defineTool(
  {
    name: 'generateConsistencyStrategy',
    description: `Genera la sección 'Paso 5: Estrategia de Constancia y Consistencia'. El objetivo es construir una reputación duradera y mantener la energía de la campaña. Debe cubrir:
- Frecuencia y Ritmo: Define la cadencia de comunicación y eventos.
- Unidad y Coherencia: Asegura que todos los mensajes y acciones estén alineados.`,
    inputSchema: z.object({}),
    outputSchema: z.string(),
  },
  async () => {
    return `Sección 5: Estrategia de Constancia y Consistencia. Generar contenido.`;
  }
);

// Tool for Step 6: Estrategia de Uso Estratégico de Microtargeting
const generateMicrotargetingStrategyTool = ai.defineTool(
  {
    name: 'generateMicrotargetingStrategy',
    description: `Genera la sección 'Paso 6: Estrategia de Uso Estratégico de Microtargeting'. El objetivo es optimizar la estrategia de cada cosa. Debe cubrir:
- Implementación de Data y Adaptación Fina: Cómo usar los datos para personalizar la comunicación a nivel micro.
- Eficiencia: Cómo medir el ROI de las acciones de microtargeting.`,
    inputSchema: z.object({
      campaignData: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Sección 6: Estrategia de Uso Estratégico de Microtargeting. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

// Tool for Step 7: Recomendaciones Clave
const generateRecommendationsTool = ai.defineTool(
  {
    name: 'generateRecommendations',
    description: `Genera la sección 'Paso 7: Recomendaciones Clave'. Debe detallar la implementación específica para:
- Priorizar el Personal Local
- Sensibilidad Cultural Inquebrantable
- Inversión en Logística de Infraestructura
- Enfoque en Promesas Tangibles
- Mecanismo de GOTV Robusto`,
    inputSchema: z.object({
      lugar: z.string(),
      resourceConstraints: z.string().optional(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Sección 7: Recomendaciones Clave. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

// Tool for Step 8: Riesgos Potenciales
const generateRisksTool = ai.defineTool(
  {
    name: 'generateRisks',
    description: `Genera la sección 'Paso 8: Riesgos Potenciales'. Debe identificar riesgos basados en el diagnóstico y proponer estrategias de mitigación. Cubre:
- Riesgo Logístico y de Seguridad
- Errores Culturales / Desconfianza Externa
- Apatía del Votante / Fatiga
- Competencia con Líderes Locales`,
    inputSchema: z.object({
      campaignData: z.string(),
      lugar: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    return `Sección 8: Riesgos Potenciales. Generar contenido basado en: ${JSON.stringify(input)}`;
  }
);

export async function generateCampaignStrategy(
  input: GenerateCampaignStrategyInput
): Promise<GenerateCampaignStrategyOutput> {
  return generateCampaignStrategyFlow(input);
}

const generateCampaignStrategyPrompt = ai.definePrompt({
    name: 'generateCampaignStrategyPrompt',
    input: { schema: GenerateCampaignStrategyInputSchema },
    output: { schema: GenerateCampaignStrategyOutputSchema },
    tools: [
        generateAuthenticityStrategyTool,
        generateNarrativeStrategyTool,
        generateManagementStrategyTool,
        generateContextStrategyTool,
        generateConsistencyStrategyTool,
        generateMicrotargetingStrategyTool,
        generateRecommendationsTool,
        generateRisksTool,
    ],
    prompt: `You are an expert political campaign strategist. Your task is to generate a complete and extremely detailed eight-part campaign strategy document. You must call all 8 of the provided tools in sequence to construct the full document. The final document must be well over 2500 words, formatted with clear headings for each section, and provide a deep, step-by-step analysis for each point.

Based on the following user input, call the tools in order to generate the full strategy:
- Campaign Data: {{{campaignData}}}
- Location: {{{lugar}}}
- Objectives: {{{objectives}}}
- Resource Constraints: {{{resourceConstraints}}}

After calling all 8 tools, combine their outputs into a single, cohesive, and extremely detailed strategy document. Ensure the final text is formatted with clear headings for each of the eight main sections.`,
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
