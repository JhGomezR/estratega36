
/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin';

function getAdminServices() {
  if (admin.apps.length > 0) {
    return {
      auth: admin.auth(),
      db: admin.firestore(),
    };
  }

  try {
    // This logic relies on the GOOGLE_APPLICATION_CREDENTIALS environment variable
    // being set in the deployment environment. It reads the service account key
    // from the file path specified in that variable.
    admin.initializeApp();

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
