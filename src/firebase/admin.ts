
/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin';

// This function ensures the Admin SDK is initialized only once.
function getAdminServices() {
  // If the app is already initialized, return the existing services.
  if (admin.apps.length > 0) {
    return {
      auth: admin.auth(),
      db: admin.firestore(),
    };
  }

  try {
    // In a managed Google Cloud environment (like App Hosting or Cloud Run),
    // initializing with explicit projectId is a robust way to ensure
    // the correct project is targeted, while still using environment credentials.
    admin.initializeApp({
        projectId: process.env.PROJECT_ID,
    });

    console.log('Firebase Admin SDK initialized successfully.');

    return {
      auth: admin.auth(),
      db: admin.firestore(),
    };
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // Re-throwing the error makes it visible during development and in logs.
    throw new Error(
      `Failed to initialize Firebase Admin SDK. Error: ${error.message}`
    );
  }
}

const { auth: adminAuth, db: adminDb } = getAdminServices();

export { adminAuth, adminDb };
