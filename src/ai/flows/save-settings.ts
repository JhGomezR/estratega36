'use server';
/**
 * @fileOverview A server action to securely save application settings.
 *
 * - saveSettings - Saves the provided settings object to Firestore.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const SettingsSchema = z.object({
  primaryColor: z.string(),
  accentColor: z.string(),
  sidebarColor: z.string(),
  logoUrl: z.string().optional(),
  identificationTypes: z.array(z.string()),
  taskPriorities: z.array(z.string()),
  taskStatuses: z.array(z.string()),
  campaignTypes: z.array(z.string()),
  campaignStatuses: z.array(z.string()),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;

export async function saveSettings(input: SettingsInput): Promise<{success: boolean}> {
  return saveSettingsFlow(input);
}

const saveSettingsFlow = ai.defineFlow(
  {
    name: 'saveSettingsFlow',
    inputSchema: SettingsSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (settings) => {
    try {
      const { firestore } = initializeFirebase();
      const settingsRef = doc(firestore, 'settings', 'app');
      await setDoc(settingsRef, settings, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("Error saving settings:", error);
      return { success: false };
    }
  }
);
