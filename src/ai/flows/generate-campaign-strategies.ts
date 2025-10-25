
'use server'

import { ai } from '@/ai/genkit'
import { z } from 'zod'

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
})
export type GenerateCampaignStrategyInput = z.infer<
  typeof GenerateCampaignStrategyInputSchema
>

// Helper function to create a focused flow for a single section
const createSectionFlow = (
  name: string,
  promptText: string
) => {
  const prompt = ai.definePrompt({
    name: `${name}Prompt`,
    input: { schema: GenerateCampaignStrategyInputSchema },
    prompt: promptText,
  });

  return ai.defineFlow(
    {
      name: `${name}Flow`,
      inputSchema: GenerateCampaignStrategyInputSchema,
      outputSchema: z.string(),
    },
    async (input) => {
      const result = await prompt(input);
      return result.text;
    }
  );
};

// Section 1: Diagnóstico y Contexto
const diagnosticoFlow = createSectionFlow(
  'diagnostico',
  `You are an expert political campaign strategist. Generate ONLY the "Diagnóstico y Contexto" section of a campaign strategy document. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}
  - Resource Constraints: {{{resourceConstraints}}}
  
  Structure your response following these subsections:
  - Tipo de Campaña: Personal, Corporativa, o Política. Define el tono, los canales y la Autenticidad Posicionada.
  - Objetivo Principal: ¿Ganar una elección? ¿Lanzar un producto? ¿Mejorar la reputación? (Debe ser medible). Establece el "norte estratégico" y el foco de la Planeación.
  - Entorno/Contexto: Situación política/social actual; temas clave de la agenda mediática y los intereses de los electores. Permite la Lectura Constante del Contexto y evita errores costosos.
  - Oponente/Competencia: ¿Quiénes son los principales oponentes/competidores? (Fortalezas y debilidades). Base para el Análisis estratégico y la diferenciación del mensaje.`
);
export async function generateDiagnosticoSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await diagnosticoFlow(input);
}


// Section 2: Marca y Mensaje
const marcaFlow = createSectionFlow(
  'marca',
  `You are an expert political campaign strategist. Generate ONLY the "Marca y Mensaje" section of a campaign strategy document. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}
  - Resource Constraints: {{{resourceConstraints}}}

  Structure your response following these subsections:
  - Valores Fundamentales: 3 a 5 valores esenciales de la marca/candidato (el ADN único). Define la Coherencia de Marca Total y la Autenticidad Posicionada.
  - Propuesta de Valor Central: ¿Qué solución concreta ofrece o qué causa defiende? ¿Qué lo hace único? Define el Mensaje Central y el eje de la campaña.
  - Tono Deseado: ¿Serio y técnico, o cercano y emocional? (Para el Storytelling). Guía la Narrativa Emocional Segmentada y la Construcción de imagen.`
);
export async function generateMarcaSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await marcaFlow(input);
}

// Section 3: Audiencia y Segmentación
const audienciaFlow = createSectionFlow(
  'audiencia',
  `You are an expert political campaign strategist. Generate ONLY the "Audiencia y Segmentación" section of a campaign strategy document. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}
  
  Structure your response following these subsections:
  - Audiencia Primaria: Demografía principal (Edad, ubicación, nivel socioeconómico) de la audiencia clave. Base para la Segmentación de mensajes y el Uso Estratégico de Microtargeting.
  - Motivaciones de la Audiencia: ¿Qué les preocupa, qué necesitan, o qué sentimiento busca movilizar? Impulsa el Uso emocional de los mensajes y el Análisis del voto.`
);
export async function generateAudienciaSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await audienciaFlow(input);
}

// Section 4: Operación y Medición
const operacionFlow = createSectionFlow(
  'operacion',
  `You are an expert political campaign strategist. Generate ONLY the "Operación y Medición" section of a campaign strategy document. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}
  - Resource Constraints: {{{resourceConstraints}}}
  
  Structure your response following these subsections:
  - Recursos y Equipo: ¿El comando es centralizado o descentralizado? ¿Se cuenta con consultores/equipo multidisciplinario? Determina la viabilidad de la Gestión Profesional y la logística.
  - Canales Actuales: ¿En qué redes sociales/medios ya tiene presencia y cuál es su alcance? Define la estrategia de Doble Presencia (Terreno y Redes) y el plan de Visibilidad.
  - Indicadores Clave de Éxito: ¿Qué se va a medir para saber si se tiene éxito? (Ej. Conocimiento de marca, favorabilidad, ventas, % de voto). Fundamento para el Monitoreo electoral y la Gestión Data-Driven.`
);
export async function generateOperacionSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await operacionFlow(input);
}

// Section 5: Constancia y Consistencia
const consistenciaFlow = createSectionFlow(
  'consistencia',
  `You are an expert political campaign strategist. Generate ONLY the "Estrategia de Constancia y Consistencia" section. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}
  
  Structure your response following these subsections:
  - Frecuencia y Ritmo: Define la cadencia de comunicación y eventos.
  - Unidad y Coherencia: Asegura que todos los mensajes y acciones estén alineados.`
);
export async function generateConsistenciaSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await consistenciaFlow(input);
}

// Section 6: Microtargeting
const microtargetingFlow = createSectionFlow(
  'microtargeting',
  `You are an expert political campaign strategist. Generate ONLY the "Estrategia de Uso Estratégico de Microtargeting" section. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}
  
  Structure your response following these subsections:
  - Implementación de Data y Adaptación Fina: Cómo usar los datos para personalizar la comunicación a nivel micro.
  - Eficiencia: Cómo medir el ROI de las acciones de microtargeting.`
);
export async function generateMicrotargetingSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await microtargetingFlow(input);
}

// Section 7: Recomendaciones Clave
const recomendacionesFlow = createSectionFlow(
  'recomendaciones',
  `You are an expert political campaign strategist. Generate ONLY the "Recomendaciones Clave" section. Be extremely detailed.
  Based on:
  - Location: {{{lugar}}}
  - Resource Constraints: {{{resourceConstraints}}}

  Provide a deep, detailed, step-by-step analysis for these recommendations:
  - Priorizar el Personal Local
  - Sensibilidad Cultural Inquebrantable
  - Inversión en Logística de Infraestructura
  - Enfoque en Promesas Tangibles
  - Mecanismo de GOTV Robusto`
);
export async function generateRecomendacionesSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await recomendacionesFlow(input);
}

// Section 8: Riesgos Potenciales
const riesgosFlow = createSectionFlow(
  'riesgos',
  `You are an expert political campaign strategist. Generate ONLY the "Riesgos Potenciales" section. Be extremely detailed.
  Based on:
  - Campaign Data: {{{campaignData}}}
  - Location: {{{lugar}}}
  - Objectives: {{{objectives}}}

  Provide a deep, detailed analysis for these potential risks:
  - Riesgo Logístico y de Seguridad
  - Errores Culturales / Desconfianza Externa
  - Apatía del Votante / Fatiga
  - Competencia con Líderes Locales`
);
export async function generateRiesgosSection(input: GenerateCampaignStrategyInput): Promise<string> {
    return await riesgosFlow(input);
}
