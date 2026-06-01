
'use server'

import { adminAuth } from '@/firebase/admin'
import { getCallerContext, assertCan } from '@/firebase/authz'
import type { UserFormValues } from '@/components/user-form'
import type { User } from '@/lib/types'

/**
 * Creates a new user in Firebase Authentication and a corresponding profile in
 * the CALLER'S database scope (tenant DB for tenant members, `(default)` for
 * legacy users). Authorization is verified server-side via the caller's ID
 * token + `user:create` permission — the Admin SDK bypasses Firestore rules,
 * so this check is the real access control.
 *
 * @param data - The user data from the form.
 * @param idToken - The caller's Firebase ID token (from `auth.currentUser.getIdToken()`).
 */
export async function createUser(
  data: UserFormValues,
  idToken: string
): Promise<{ uid?: string; error?: string }> {
  let ctx;
  try {
    ctx = await getCallerContext(idToken)
    assertCan(ctx, 'user:create')
  } catch (e: any) {
    return { error: e?.message || 'No autorizado.' }
  }

  try {
    const { password, ...profileData } = data

    if (!password) {
      return { error: 'La contraseña es obligatoria para nuevos usuarios.' }
    }

    // 1. Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: profileData.email,
      password: password,
      emailVerified: false,
      disabled: false,
    })

    // 2. Create the user profile in the caller's database scope
    const newUserProfile: Partial<User> = {
      ...profileData,
      email: profileData.email,
      avatar: `https://picsum.photos/seed/user${Date.now()}/100/100`,
      status: 'activo' as const,
    }

    if ('parentId' in newUserProfile && (newUserProfile.parentId === 'none' || !newUserProfile.parentId)) {
        delete newUserProfile.parentId;
    }

    await ctx.db.collection('users').doc(userRecord.uid).set(newUserProfile)

    return { uid: userRecord.uid }

  } catch (error: any) {
    console.error('Error creating user in server action:', error);
    
    let errorMessage = 'Ocurrió un error desconocido durante la creación del usuario.'
    
    const errorCode = error.code || (error.errorInfo ? error.errorInfo.code : '');
    const errorMessageText = error.message || '';

    if (errorCode === 'auth/email-already-exists' || errorMessageText.includes('EMAIL_EXISTS')) {
      errorMessage = 'El correo electrónico ya está en uso por otra cuenta.'
    } else if (errorCode === 'auth/weak-password' || errorMessageText.includes('WEAK_PASSWORD')) {
      errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.'
    } else if (errorMessageText.includes('insufficient permission') || errorMessageText.includes('PERMISSION_DENIED')) {
      errorMessage = `Error de permisos del servidor: La cuenta de servicio no tiene los permisos necesarios en Google Cloud para crear usuarios. Revisa los roles IAM (ej. 'Firebase Authentication Admin', 'Service Usage Consumer') de la cuenta de servicio asociada a tu backend.`
    } else if (errorMessageText) {
      errorMessage = errorMessageText;
    }


    return { error: errorMessage }
  }
}
