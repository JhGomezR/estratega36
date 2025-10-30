
'use server'
import * as admin from 'firebase-admin'

// Initialize the Admin SDK if it hasn't been initialized yet
if (!admin.apps.length) {
  // When running in a Google Cloud environment, the SDK automatically detects the project's
  // service account credentials and uses them to initialize.
  admin.initializeApp()
}

const auth = admin.auth();
const firestore = admin.firestore();

export async function createUser(data: any) {
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
