/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin'

function getAdminServices() {
  if (admin.apps.length > 0) {
    return {
      auth: admin.auth(),
      db: admin.firestore(),
    }
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

  if (!serviceAccountKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Admin SDK features will fail.'
    )
  }

  try {
    // Newlines in the private key must be properly escaped (e.g., "\\n") in the .env file.
    const serviceAccount = JSON.parse(serviceAccountKey)

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })

    console.log('Firebase Admin SDK initialized successfully.')

    return {
      auth: admin.auth(),
      db: admin.firestore(),
    }
  } catch (error: any) {
    throw new Error(
      `Failed to parse or initialize Firebase Admin SDK. Check the FIREBASE_SERVICE_ACCOUNT_KEY. Parse Error: ${error.message}`
    )
  }
}

const { auth: adminAuth, db: adminDb } = getAdminServices()

export { adminAuth, adminDb }
