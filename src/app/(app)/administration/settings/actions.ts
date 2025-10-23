'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

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

type SettingsInput = z.infer<typeof SettingsSchema>;

let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp();
} else {
  adminApp = getApps()[0];
}

const firestore = getFirestore(adminApp);

export async function saveSettings(settings: SettingsInput): Promise<{ success: boolean }> {
  try {
    const validatedSettings = SettingsSchema.parse(settings);
    const settingsRef = firestore.collection('settings').doc('app');
    await settingsRef.set(validatedSettings, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error saving settings with admin SDK:", error);
    if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
    }
    return { success: false };
  }
}
