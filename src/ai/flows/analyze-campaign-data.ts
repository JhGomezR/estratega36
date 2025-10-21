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
  campaignData: z.string().describe('The campaign data to analyze.'),
  campaignObjectives: z.string().describe('The objectives of the campaign.'),
});
export type AnalyzeCampaignDataInput = z.infer<typeof AnalyzeCampaignDataInputSchema>;

const AnalyzeCampaignDataOutputSchema = z.object({
  keyTrends: z.string().describe('The key trends identified in the campaign data.'),
  newOpportunities: z.string().describe('New opportunities discovered in the campaign data.'),
  recommendations: z.string().describe('Recommendations for improving campaign effectiveness.'),
});
export type AnalyzeCampaignDataOutput = z.infer<typeof AnalyzeCampaignDataOutputSchema>;

export async function analyzeCampaignData(input: AnalyzeCampaignDataInput): Promise<AnalyzeCampaignDataOutput> {
  return analyzeCampaignDataFlow(input);
}

const analyzeCampaignDataPrompt = ai.definePrompt({
  name: 'analyzeCampaignDataPrompt',
  input: {schema: AnalyzeCampaignDataInputSchema},
  output: {schema: AnalyzeCampaignDataOutputSchema},
  prompt: `You are an AI assistant designed to analyze campaign data, identify trends, and discover new opportunities.

  Analyze the following campaign data and objectives, then identify key trends, new opportunities, and recommendations for improving campaign effectiveness.

  Campaign Data: {{{campaignData}}}
  Campaign Objectives: {{{campaignObjectives}}}

  Respond in a structured format, clearly outlining the key trends, new opportunities, and recommendations.
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
