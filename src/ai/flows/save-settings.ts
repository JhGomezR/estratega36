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
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  sidebarColor: z.string().optional(),
  logoUrl: z.string().optional(),
  identificationTypes: z.array(z.string()).optional(),
  taskPriorities: z.array(z.string()).optional(),
  taskStatuses: z.array(z.string()).optional(),
  campaignTypes: z.array(z.string()).optional(),
  campaignStatuses: z.array(z.string()).optional(),
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
      // This flow runs on the server, but we can use the client SDK's initialization
      // to get a correctly configured Firestore instance.
      const { firestore } = initializeFirebase();
      const settingsRef = doc(firestore, 'settings', 'app');
      await setDoc(settingsRef, settings, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("Error saving settings:", error);
      // Ensure a structured error is returned for the client to handle.
      return { success: false };
    }
  }
);
