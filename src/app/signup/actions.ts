
'use server'

import { adminAuth, adminDb } from '@/firebase/admin'
import type { User, Tenant } from '@/lib/types'
import { z } from 'zod'
import { GoogleAuth } from 'google-auth-library';
import serviceAccount from '@/firebase/service-account.json';


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

/**
 * Checks if a subdomain is already taken.
 * @param subdomain The subdomain to check.
 * @returns A promise that resolves to an object with a boolean `exists`.
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{ exists: boolean }> {
  try {
    if (!subdomain) {
      return { exists: false }; // Don't check empty strings
    }
    const tenantsRef = adminDb.collection('tenants');
    const existingTenant = await tenantsRef.doc(subdomain).get();
    return { exists: existingTenant.exists };
  } catch (error) {
    console.error('Error checking subdomain:', error);
    // On error, assume it might exist to be safe, or handle as needed
    return { exists: true };
  }
}

/**
 * Creates a new Firestore database instance via the Google Cloud API.
 * @param projectId The Google Cloud project ID.
 * @param databaseId The desired ID for the new Firestore database.
 * @param locationId The location for the new database (e.g., 'nam5').
 * @returns A promise that resolves when the operation is complete.
 */
async function createFirestoreDatabase(projectId: string, databaseId: string, locationId: string = 'nam5') {
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    const accessToken = await auth.getAccessToken();

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${databaseId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: locationId,
        type: 'FIRESTORE_NATIVE',
         // You can add more configuration here, e.g., deleteProtectionState
        deleteProtectionState: 'DELETE_PROTECTION_DISABLED',
      }),
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        console.error('API Error Response:', errorBody);
        throw new Error(`Failed to create database. Status: ${response.status}. Message: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const operation = await response.json();
    console.log('Database creation operation started:', operation.name);
    // Note: This starts the creation. It's a long-running operation.
    // For a production app, you'd poll the operation status. For this context, we assume it will succeed.
    return operation;

  } catch (error) {
    console.error('Error in createFirestoreDatabase:', error);
    // Re-throw the error to be caught by the main handler
    throw error;
  }
}


export async function createTenantAndUser(
  data: SignUpFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate if subdomain already exists in the 'tenants' collection
    const tenantsRef = adminDb.collection('tenants')
    const existingTenant = await tenantsRef
      .doc(data.subdomain)
      .get()

    if (existingTenant.exists) {
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
    const databaseId = data.subdomain === 'ardila' ? '(default)' : `${data.subdomain}-${generateRandomString(5)}`;

     // 4. Create the new Firestore database via API
    if (databaseId !== '(default)') {
      await createFirestoreDatabase(serviceAccount.project_id, databaseId);
    }

    // 5. Create the tenant document in the default Firestore database
    const newTenant: Tenant = {
      id: data.subdomain,
      companyName: data.companyName,
      subdomain: data.subdomain,
      plan: data.plan,
      databaseId: databaseId,
      ownerUid: userRecord.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    }
    await tenantsRef.doc(data.subdomain).set(newTenant);

    // 6. Create the admin user profile in the default database
    // This profile INCLUDES the tenantId for easy lookup.
    const adminProfile: Omit<User, 'id'> = {
      firstName,
      lastName,
      email: userRecord.email!,
      roleId: 'admin', // Every new tenant gets an admin
      tenantId: data.subdomain,
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
