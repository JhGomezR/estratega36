'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const BrandingSettingsSchema = z.object({
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  sidebarColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

type BrandingSettingsInput = z.infer<typeof BrandingSettingsSchema>;

// Initialize Firebase Admin SDK
let adminApp: App;
if (!getApps().length) {
    try {
        // This works in a deployed Firebase environment
        adminApp = initializeApp();
    } catch (e) {
        // Fallback for local development
        console.warn("Could not initialize Firebase Admin with default credentials. Is GOOGLE_APPLICATION_CREDENTIALS set?");
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        });
    }
} else {
  adminApp = getApps()[0];
}

const firestore = getFirestore(adminApp);

export async function saveBrandingSettings(settings: BrandingSettingsInput): Promise<{ success: boolean }> {
  try {
    const validatedSettings = BrandingSettingsSchema.parse(settings);
    const settingsRef = firestore.collection('settings').doc('branding');
    await settingsRef.set(validatedSettings, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error saving branding settings with admin SDK:", error);
    if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
    }
    return { success: false };
  }
}

export async function updateList(listId: string, items: string[]): Promise<{ success: boolean }> {
    try {
        if (!listId || !Array.isArray(items)) {
            throw new Error("Invalid input for updating list.");
        }
        const listRef = firestore.collection('lists').doc(listId);
        await listRef.update({ items });
        return { success: true };
    } catch (error) {
        console.error(`Error updating list ${listId}:`, error);
        return { success: false };
    }
}
