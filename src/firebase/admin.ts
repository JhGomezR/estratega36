/**
 * @fileoverview Initializes the Firebase Admin SDK.
 * This module ensures that the Admin SDK is initialized as a singleton.
 * It is intended to be used ONLY in server-side code (e.g., Next.js Server Actions, API routes).
 */

import * as admin from 'firebase-admin'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

if (!admin.apps.length) {
  if (!serviceAccountKey) {
    // This will log on the server when the app starts if the key is missing.
    console.error(
      'CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. ' +
      'Admin SDK features will fail. Ensure the .env file is correctly set up.'
    )
  } else {
    try {
      // The key from .env is a string, so it needs to be parsed.
      // Important: Ensure the .env variable is a valid, single-line JSON string.
      // Newlines in the private key must be properly escaped (e.g., "\\n").
      const serviceAccount = JSON.parse(serviceAccountKey)

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('Firebase Admin SDK initialized successfully.')
    } catch (error: any) {
      console.error(
        'CRITICAL: Failed to parse or initialize Firebase Admin SDK. ' +
        'Check the FIREBASE_SERVICE_ACCOUNT_KEY in your .env file. ' +
        `Parse Error: ${error.message}`
      )
    }
  }
}

// Export the initialized services.
// If initialization failed, these will throw errors when used,
// which is desirable as it indicates a critical configuration issue.
export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
