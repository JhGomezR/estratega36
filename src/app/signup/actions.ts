
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
    const databaseId = `${data.subdomain}-${generateRandomString(5)}`

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
    const tenantDocRef = await tenantsRef.add(newTenant)

    // 5. Create the admin user profile inside the NEW tenant database
    // This assumes you have logic later to connect to the specific tenant DB.
    // For now, we'll create the user in the default DB but inside a tenant-specific path.
    // A better approach would be to use a Cloud Function triggered by tenant creation
    // to provision the user in the correct database if using multi-DB feature.
    // Let's simulate this by just storing it under a main 'users' collection for now,
    // as direct multi-db creation from server action is complex.
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

    // This user profile should ideally go into the tenant's own DB.
    // Awaiting further implementation for multi-db connection.
    // For now, we'll place it in the default DB to complete the signup flow.
    // This part will need refactoring.
    await adminDb.collection('users').doc(userRecord.uid).set(adminProfile)
     await adminDb.collection('tenants').doc(tenantDocRef.id).collection('users').doc(userRecord.uid).set(adminProfile);


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
