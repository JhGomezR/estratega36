
/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin';
import serviceAccount from './service-account.json';

function getAdminServices() {
  if (admin.apps.length > 0) {
    return {
      auth: admin.auth(),
      db: admin.firestore(),
    };
  }

  try {
    admin.initializeApp({
      // The type assertion is safe because service-account.json is a valid ServiceAccount object.
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });

    console.log('Firebase Admin SDK initialized successfully.');

    return {
      auth: admin.auth(),
      db: admin.firestore(),
    };
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // In a real application, you might want to handle this more gracefully
    // For this context, re-throwing makes the problem visible.
    throw new Error(
      `Failed to initialize Firebase Admin SDK. Error: ${error.message}`
    );
  }
}

const { auth: adminAuth, db: adminDb } = getAdminServices();

export { adminAuth, adminDb };
