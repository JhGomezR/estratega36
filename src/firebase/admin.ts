
/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin';
import serviceAccount from './service-account.json';

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.project_id, // Explicitly set project ID
    });
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(
      `Failed to initialize Firebase Admin SDK. Error: ${error.message}`
    );
  }
}

const adminApp = getAdminApp();
// The main admin instance, useful for accessing services like firestore()
const adminAuth = admin.auth(adminApp);
// A direct reference to the default Firestore database instance
const adminDb = admin.firestore(adminApp);

export { admin, adminAuth, adminDb };
