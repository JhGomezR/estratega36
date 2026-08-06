
'use server'

import { adminAuth } from '@/firebase/admin'
import { getCallerContext, assertCan } from '@/firebase/authz'
import { assertWithinUserLimit } from '@/firebase/plan-limits'
import { setTenantClaims } from '@/firebase/claims'
import type { UserFormValues } from '@/components/user-form'
import type { User } from '@/lib/types'

/**
 * Creates a new user in Firebase Authentication and a corresponding profile in
 * the CALLER'S database scope (tenant DB for tenant members, `(default)` for
 * legacy users). Authorization is verified server-side via the caller's ID
 * token + `user:create` permission — the Admin SDK bypasses Firestore rules,
 * so this check is the real access control.
 *
 * When the caller operates inside a tenant (a tenant member, or a platform
 * operator impersonating one), the new account also gets its `{tenantId,
 * roleId}` custom claims. WITHOUT those claims the client provider would treat
 * the account as "legacy" and connect it to `(default)` instead of the tenant
 * database, leaving it unusable — so a failure to set them rolls the whole
 * creation back rather than leaving an orphan Auth account.
 *
 * @param data - The user data from the form.
 * @param idToken - The caller's Firebase ID token (from `auth.currentUser.getIdToken()`).
 * @param impersonatedTenantId - Tenant being impersonated by a platform operator, if any.
 */
export async function createUser(
  data: UserFormValues,
  idToken: string,
  impersonatedTenantId?: string | null
): Promise<{ uid?: string; error?: string }> {
  let ctx;
  try {
    ctx = await getCallerContext(idToken, impersonatedTenantId)
    assertCan(ctx, 'user:create')
    // Límite de usuarios del plan (denormalizado en el tenant).
    await assertWithinUserLimit(ctx)
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

    // 2. Assign the tenant custom claims ({tenantId, roleId}) so the account
    //    resolves to the tenant database on its first sign-in. The tenantId
    //    comes from the verified caller context, never from the form.
    if (ctx.tenantId) {
      try {
        await setTenantClaims(userRecord.uid, ctx.tenantId, profileData.roleId)
      } catch (claimsError: any) {
        // Roll back: an Auth account without claims is a broken account.
        try {
          await adminAuth.deleteUser(userRecord.uid)
        } catch (rollbackError) {
          console.error('Rollback failed, orphan auth user left behind:', userRecord.uid, rollbackError)
        }
        console.error('Error setting tenant claims for new user:', claimsError)
        return {
          error:
            'No se pudieron asignar los permisos del tenant al nuevo usuario; la creación fue revertida.',
        }
      }
    }

    // 3. Create the user profile in the caller's database scope
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
