import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Central Genkit instance (Genkit 1.x API).
 *
 * Migrated from the deprecated `configureGenkit()` (Genkit 0.5.x) to `genkit()`.
 * The default model is set here so prompts/flows inherit it unless overridden.
 *
 * The Google AI plugin reads its API key from the environment
 * (GEMINI_API_KEY / GOOGLE_API_KEY).
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'),
});
