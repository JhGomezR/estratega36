'use server'

require('dotenv').config({ path: '.env' });
import { adminAuth, adminDb } from '@/firebase/admin'
import type { UserFormValues } from '@/components/user-form'
import type { User } from '@/lib/types'

/**
 * Creates a new user in Firebase Authentication and a corresponding user profile in Firestore.
 * This is a server action and should only be called from a server environment.
 * @param data - The user data from the form.
 * @returns An object with the new user's UID or an error message.
 */
export async function createUser(
  data: UserFormValues
): Promise<{ uid?: string; error?: string }> {
  try {
    const { password, ...profileData } = data

    if (!password) {
      return { error: 'La contraseña es obligatoria para nuevos usuarios.' }
    }

    // 1. Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: profileData.email,
      password: password,
      emailVerified: false, // You might want to implement an email verification flow
      disabled: false,
    })

    // 2. Create the user profile in Firestore
    const newUserProfile: Partial<User> = {
      ...profileData,
      email: profileData.email, // Ensure email is part of the profile
      avatar: `https://picsum.photos/seed/user${Date.now()}/100/100`,
      status: 'activo' as const,
    }
    
    // Clean up parentId if it's not provided or set to 'none'
    if ('parentId' in newUserProfile && (newUserProfile.parentId === 'none' || !newUserProfile.parentId)) {
        delete newUserProfile.parentId;
    }

    await adminDb.collection('users').doc(userRecord.uid).set(newUserProfile)

    return { uid: userRecord.uid }

  } catch (error: any) {
    console.error('Error creating user in server action:', error);
    
    // Provide specific, helpful error messages
    let errorMessage = 'Ocurrió un error desconocido durante la creación del usuario.'
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El correo electrónico ya está en uso por otra cuenta.'
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.'
    } else if (error.message) {
      // Return the specific error message from Firebase Admin SDK if available
      errorMessage = error.message;
    }

    return { error: errorMessage }
  }
}
