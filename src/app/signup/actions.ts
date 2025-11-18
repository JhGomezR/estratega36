
'use server'

import { admin, adminAuth, adminDb } from '@/firebase/admin'
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

export async function checkSubdomainAvailability(
  subdomain: string
): Promise<{ exists: boolean }> {
  try {
    if (!subdomain) {
      return { exists: false }
    }
    // All tenants are in the default DB, so we check there.
    const existingTenant = await adminDb.collection('tenants').doc(subdomain).get()
    return { exists: existingTenant.exists }
  } catch (error) {
    console.error('Error checking subdomain:', error)
    // Fail safe: if we can't check, assume it exists to prevent overwrites.
    return { exists: true }
  }
}

async function initializeTenantData(
  tenantId: string,
  adminUser: Omit<User, 'id'>,
  adminUserId: string
) {
  try {
    // All data is written to the default DB, but under the tenant's path.
    const batch = adminDb.batch();

    // The user profile is now stored under the tenant's subcollection
    const userRef = adminDb.doc(`tenants/${tenantId}/users/${adminUserId}`);
    batch.set(userRef, adminUser);

    // We can also add tenant-specific roles, lists, etc. here if needed in the future.
    // For now, roles and lists are global in the default DB.

    await batch.commit();
    console.log(`Initial data for tenant ${tenantId} created successfully in the default database.`);
    
  } catch (error) {
    console.error(`Error initializing data for tenant ${tenantId}:`, error);
    // This is a critical error, we should probably handle it (e.g., by cleaning up the created user/tenant)
    // For now, we throw to make the failure visible.
    throw error;
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

    const [firstName, ...lastNameParts] = data.fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
      emailVerified: false,
      disabled: false,
    });
    
    // All tenants will use the single, default database.
    const databaseId = `(default)`;

    const newTenant: Omit<Tenant, 'id'> = {
      companyName: data.companyName,
      subdomain: data.subdomain,
      plan: data.plan,
      databaseId: databaseId, // All tenants point to the default DB
      ownerUid: userRecord.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    // Create the main tenant document in the `tenants` collection.
    await tenantsRef.doc(data.subdomain).set(newTenant);

    const adminProfile: Omit<User, 'id'> = {
      firstName,
      lastName,
      email: userRecord.email!,
      roleId: 'admin',
      idType: 'admin',
      idNumber: '00000000',
      phone: '0000000000',
      cityIds: [],
      campaignIds: [],
      avatar: `https://picsum.photos/seed/${userRecord.uid}/100/100`,
      status: 'activo',
    };
    
    // Now, initialize the tenant's specific data within the default database.
    // This includes creating the admin's user profile within the tenant's subcollection.
    await initializeTenantData(data.subdomain, adminProfile, userRecord.uid);
    
    // Also write default roles to the main DB if they don't exist
    const adminRoleDoc = await adminDb.collection('roles').doc('admin').get();
    if (!adminRoleDoc.exists) {
         await adminDb.collection('roles').doc('admin').set({
            name: 'Admin',
            permissions: [ "campaign:create", "campaign:read", "campaign:update", "campaign:delete", "voter:create", "voter:read", "voter:update", "voter:delete", "user:create", "user:read", "user:update", "user:delete", "role:create", "role:read", "role:update", "role:delete", "city:create", "city:read", "city:update", "city:delete", "task:create", "task:read", "task:update", "task:delete", "call:create", "call:read", "call:update", "call:delete", "report:read", "setting:update" ],
            status: 'activo'
        });
    }

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
