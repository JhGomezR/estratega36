
'use server'
import * as admin from 'firebase-admin'

// Helper function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When running in a Google Cloud environment, the SDK automatically detects the project's
  // service account credentials and uses them to initialize.
  // The GOOGLE_APPLICATION_CREDENTIALS env var should be set.
  return admin.initializeApp();
}


export async function createUser(data: any) {
  initializeFirebaseAdmin();
  
  const auth = admin.auth();
  const firestore = admin.firestore();

  try {
    const { email, password, ...profileData } = data;

    // 1. Create the user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${profileData.firstName} ${profileData.lastName}`,
    });

    // 2. Create the user profile document in Firestore
    const newUserProfile = {
      ...profileData,
      avatar: `https://picsum.photos/seed/user${Date.now()}/100/100`,
      status: 'activo',
    };
    
    await firestore.collection('users').doc(userRecord.uid).set(newUserProfile);

    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user:", error);
    // It's important to return a serializable error object
    return { error: error.code || 'An unknown error occurred' };
  }
}
