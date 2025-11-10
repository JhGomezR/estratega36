
'use server'

import * as admin from 'firebase-admin';
import type { UserFormValues } from '@/components/user-form';
import type { User } from '@/lib/types';

// Helper function to initialize Firebase Admin SDK safely for both production and development.
function initializeFirebaseAdmin() {
  // If the app is already initialized, return the existing app.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When running in a Google Cloud environment (like App Hosting), the SDK automatically
  // detects the project's service account credentials. For local development,
  // we can provide them explicitly via an environment variable.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    // Development/local environment: Use the service account key from the environment variable.
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error: any) {
        console.error('Failed to initialize Firebase Admin with service account key:', error.message);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Please check your environment variable.');
    }
  } else {
    // Production environment: Rely on Application Default Credentials.
    try {
        return admin.initializeApp();
    } catch(error: any) {
        console.error('Firebase Admin SDK initialization error:', error.message);
        throw new Error('Could not initialize Firebase Admin SDK. In a production environment, ensure the runtime has access to Google Cloud credentials. In development, set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    }
  }
}

export async function createUser(data: UserFormValues): Promise<{ uid?: string; error?: string }> {
  try {
    initializeFirebaseAdmin();
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
    return { error: error.code || 'Ocurrió un error desconocido durante la creación del usuario.' };
  }
}
