'use server'

import { config } from 'dotenv';
config();

import * as admin from 'firebase-admin';
import type { UserFormValues } from '@/components/user-form';
import type { User } from '@/lib/types';

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 * This function is designed to be idempotent.
 * @returns A boolean indicating if the initialization was successful or already done.
 */
function initializeFirebaseAdmin(): boolean {
  // If the SDK is already initialized, don't do it again.
  if (admin.apps.length > 0) {
    return true;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    return false;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully.');
    return true;
  } catch (error: any) {
    console.error('CRITICAL: Failed to parse or initialize Firebase Admin SDK. Check the FIREBASE_SERVICE_ACCOUNT_KEY in your .env file.', error.message);
    return false;
  }
}

export async function createUser(data: UserFormValues): Promise<{ uid?: string; error?: string }> {
  
  if (!initializeFirebaseAdmin()) {
      return { error: 'El servidor no pudo inicializar los servicios de administrador de Firebase. Revisa la consola del servidor para ver los detalles del error en la clave de servicio.' };
  }
  
  try {
    const auth = admin.auth();
    const firestore = admin.firestore();

    const { password, ...profileData } = data;
    
    if (!password) {
        return { error: 'La contraseña es obligatoria para nuevos usuarios.' };
    }

    const userRecord = await auth.createUser({
      email: profileData.email,
      password: password,
      emailVerified: false,
      disabled: false,
    });

    const newUserProfile: Partial<User> = {
      ...profileData,
      email: profileData.email,
      avatar: `https://picsum.photos/seed/user${Date.now()}/100/100`,
      status: 'activo' as const,
    };
     if ('parentId' in newUserProfile && (newUserProfile.parentId === 'none' || !newUserProfile.parentId)) {
        delete newUserProfile.parentId;
    }

    await firestore.collection('users').doc(userRecord.uid).set(newUserProfile);

    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user in server action:", error);
    // Return a serializable error message with the code for specific client-side handling
    return { error: error.code || error.message || 'Ocurrió un error desconocido durante la creación del usuario.' };
  }
}
