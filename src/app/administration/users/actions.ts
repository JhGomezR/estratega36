
'use server'

import { config } from 'dotenv';
config();

import * as admin from 'firebase-admin';
import type { UserFormValues } from '@/components/user-form';
import type { User } from '@/lib/types';

// Simplified, direct initialization of Firebase Admin SDK
if (admin.apps.length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error('Failed to parse or initialize Firebase Admin SDK with service account key:', (error as Error).message);
    }
  } else {
    // This case will be hit if the .env file is missing or the variable is not set.
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please ensure it is present in your .env file.');
  }
}


export async function createUser(data: UserFormValues): Promise<{ uid?: string; error?: string }> {
  // Check if initialization failed and return a specific error
  if (admin.apps.length === 0) {
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
