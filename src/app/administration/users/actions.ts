
'use server'

import * as admin from 'firebase-admin';
import type { UserFormValues } from '@/components/user-form';
import type { User } from '@/lib/types';

// Helper function to initialize Firebase Admin SDK safely.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When running in a Google Cloud environment (like Firebase), the SDK automatically
  // detects the project's service account credentials.
  // For local development, we parse it from an environment variable.
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    const serviceAccount = JSON.parse(serviceAccountString);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize admin app.', error);
    // If running in a managed Google environment (like Cloud Run, Cloud Functions),
    // it might work without explicit credentials.
    try {
        return admin.initializeApp();
    } catch (initError) {
        console.error('Secondary initializeApp() failed', initError);
        throw new Error('Could not initialize Firebase Admin SDK. Please check server logs.');
    }
  }
}

export async function createUser(data: UserFormValues): Promise<{ uid?: string; error?: string }> {
  try {
    initializeFirebaseAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();

    // The password will not be present when editing a user.
    // It's only required for creation.
    const { password, ...profileData } = data;
    
    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: profileData.email,
      password: password,
      emailVerified: false,
      disabled: false,
    });

    // 2. Create user profile in Firestore
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
    // Return a serializable error message with the code
    return { error: error.code || 'Unknown error occurred' };
  }
}
