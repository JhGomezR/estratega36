
'use server'

import { adminAuth, adminDb } from '@/firebase/admin'
import type { User, Tenant } from '@/lib/types'
import { z } from 'zod'

const signUpFormSchema = z.object({
  companyName: z.string(),
  fullName: z.string(),
  subdomain: z.string(),
  email: z.string().email(),
  password: z.string(),
  plan: z.enum(['basico', 'estratega', '360']),
})

type SignUpFormValues = z.infer<typeof signUpFormSchema>

function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function createTenantAndUser(
  data: SignUpFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate if subdomain already exists in the 'tenants' collection
    const tenantsRef = adminDb.collection('tenants')
    const existingTenant = await tenantsRef
      .where('subdomain', '==', data.subdomain)
      .get()

    if (!existingTenant.empty) {
      return { success: false, error: 'El subdominio ya está en uso.' }
    }

    // 2. Create the user in Firebase Authentication
    const [firstName, ...lastNameParts] = data.fullName.split(' ')
    const lastName = lastNameParts.join(' ')

    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
      emailVerified: false,
      disabled: false,
    })

    // 3. Generate the unique database ID for the new tenant
    // For development/default, we might use '(default)'
    const databaseId = data.subdomain === 'ardila' ? '(default)' : `${data.subdomain}-${generateRandomString(5)}`;

    // 4. Create the tenant document in the default Firestore database
    const newTenant: Tenant = {
      companyName: data.companyName,
      subdomain: data.subdomain,
      plan: data.plan,
      databaseId: databaseId,
      ownerUid: userRecord.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    }
    await tenantsRef.add(newTenant);

    // 5. Create the admin user profile in the default database
    const adminProfile: Omit<User, 'id'> = {
      firstName,
      lastName,
      email: userRecord.email!,
      roleId: 'admin', // Every new tenant gets an admin
      idType: 'admin',
      idNumber: '00000000',
      phone: '0000000000',
      cityIds: [],
      campaignIds: [],
      avatar: `https://picsum.photos/seed/${userRecord.uid}/100/100`,
      status: 'activo',
    }
    
    // This user profile goes into the default DB.
    await adminDb.collection('users').doc(userRecord.uid).set(adminProfile);

    return { success: true }
  } catch (error: any) {
    console.error('Error creating tenant and user:', error)

    let errorMessage =
      'Ocurrió un error desconocido durante la creación de la cuenta.'
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El correo electrónico ya está en uso por otra cuenta.'
    } else if (error.code === 'auth/weak-password') {
      errorMessage =
        'La contraseña es demasiado débil. Debe tener al menos 8 caracteres.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return { success: false, error: errorMessage }
  }
}
