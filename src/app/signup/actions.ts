
'use server'

import { admin, adminAuth, adminDb } from '@/firebase/admin'
import type { User, Tenant } from '@/lib/types'
import { z } from 'zod'
import { google } from 'googleapis'

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

async function createFirestoreDatabase(projectId: string, databaseId: string, locationId: string): Promise<void> {
  try {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const authClient = await auth.getClient();
    const firestoreAdmin = google.firestore({ version: 'v1', auth: authClient });

    console.log(`Requesting creation of database: ${databaseId} in project ${projectId} at ${locationId}`);

    // This starts a long-running operation, but we don't wait for it here.
    await firestoreAdmin.projects.databases.create({
        parent: `projects/${projectId}`,
        databaseId: databaseId,
        requestBody: {
            locationId: locationId,
            type: 'NATIVE', // Or 'DATASTORE_MODE'
        },
    });

    console.log(`Database creation initiated for ${databaseId}.`);
  } catch (error: any) {
    // It's common to get an "ALREADY_EXISTS" error if you re-run this, which can be ignored in dev.
    if (error.code === 6) { // 6 corresponds to ALREADY_EXISTS
        console.log(`Database ${databaseId} already exists. Proceeding...`);
        return;
    }
    console.error(`Error creating Firestore database ${databaseId}:`, error);
    throw new Error(`Failed to create Firestore database: ${error.message}`);
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
    
    // Define the new database ID. It must be lowercase.
    const databaseId = `${data.subdomain.toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
    const projectId = process.env.GCLOUD_PROJECT || 'studio-8059115072-3707d';
    const location = 'nam5'; // e.g., 'nam5' (North America), 'eur3' (Europe)

    // 1. Initiate the creation of the new Firestore database
    await createFirestoreDatabase(projectId, databaseId, location);

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
    // This is because we cannot reliably wait for the database creation to finish here.
    
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
