
'use server'

import { admin, adminAuth, adminDb } from '@/firebase/admin'
import type { User, Tenant } from '@/lib/types'
import { z } from 'zod'
import { GoogleAuth } from 'google-auth-library';

const signUpFormSchema = z.object({
  companyName: z.string(),
  fullName: z.string(),
  subdomain: z.string(),
  email: z.string().email(),
  password: z.string(),
  plan: z.enum(['basico', 'estratega', '360']),
})

type SignUpFormValues = z.infer<typeof signUpFormSchema>

export async function checkSubdomainAvailability(
  subdomain: string
): Promise<{ exists: boolean }> {
  try {
    if (!subdomain) {
      return { exists: false }
    }
    const existingTenant = await adminDb.collection('tenants').doc(subdomain).get()
    return { exists: existingTenant.exists }
  } catch (error) {
    console.error('Error checking subdomain:', error)
    return { exists: true }
  }
}

async function createFirestoreDatabase(
  projectId: string,
  databaseId: string,
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
        throw new Error('Failed to retrieve a valid access token.');
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${databaseId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: locationId,
        type: 'NATIVE',
      }),
    });

    if (response.status === 409) {
      console.log(`Database ${databaseId} already exists. Proceeding.`);
      return { success: true };
    }
    
    if (!response.ok) {
        const errorBody = await response.json();
        console.error(`Error creating Firestore database ${databaseId}:`, errorBody);
        const errorMessage = errorBody.error?.message || `Request failed with status code ${response.status}`;
        return { success: false, error: `Failed to create Firestore database: ${errorMessage}` };
    }
    
    const operation = await response.json();
    console.log(`Database creation initiated for ${databaseId}. Operation: ${operation.name}`);
    return { success: true };

  } catch (error: any) {
    console.error(`Exception while trying to create Firestore database ${databaseId}:`, error);
    return { success: false, error: `Failed to create Firestore database: ${error.message}` };
  }
}


export async function createTenantAndUser(
  data: SignUpFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantsRef = adminDb.collection('tenants');
    const existingTenant = await tenantsRef.doc(data.subdomain).get();

    if (existingTenant.exists) {
      return { success: false, error: 'El subdominio ya está en uso.' };
    }

    // Create Auth user (this is global for the project)
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
      emailVerified: false,
      disabled: false,
    });
    
    const databaseId = `${data.subdomain.toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
    const projectId = process.env.GCLOUD_PROJECT || 'studio-8059115072-3707d';
    const location = 'nam5'; // e.g., 'nam5' (North America), 'eur3' (Europe)

    // 1. Initiate the creation of the new Firestore database
    const dbCreationResult = await createFirestoreDatabase(projectId, databaseId, location);
    if (!dbCreationResult.success) {
      // If DB creation fails, we should not proceed.
      // We might want to delete the created auth user here for cleanup.
      await adminAuth.deleteUser(userRecord.uid);
      return { success: false, error: dbCreationResult.error };
    }

    // 2. Create the tenant document in the 'default' database
    const newTenant: Omit<Tenant, 'id'> = {
      companyName: data.companyName,
      subdomain: data.subdomain,
      plan: data.plan,
      databaseId: databaseId, 
      ownerUid: userRecord.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    await tenantsRef.doc(data.subdomain).set(newTenant);
    
    // The initialization of the new database (creating collections) will be handled
    // by the client-side FirebaseClientProvider the first time the tenant logs in.
    console.log(`Tenant ${data.subdomain} created. DB ID: ${databaseId}. Initialization will occur on first login.`);

    return { success: true };
  } catch (error: any) {
    console.error('Error creating tenant and user:', error);

    let errorMessage = 'Ocurrió un error desconocido durante la creación de la cuenta.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El correo electrónico ya está en uso por otra cuenta.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 8 caracteres.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}
