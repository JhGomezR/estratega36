
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

function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function checkSubdomainAvailability(
  subdomain: string
): Promise<{ exists: boolean }> {
  try {
    if (!subdomain) {
      return { exists: false }
    }
    const tenantsRef = adminDb.collection('tenants')
    const existingTenant = await tenantsRef.doc(subdomain).get()
    return { exists: existingTenant.exists }
  } catch (error) {
    console.error('Error checking subdomain:', error)
    return { exists: true }
  }
}

async function initializeTenantDatabase(
  databaseId: string,
  adminUser: Omit<User, 'id'>,
  adminUserId: string,
) {
  try {
    const tenantDb = admin.firestore().database(databaseId)

    const batch = tenantDb.batch()

    // 1. Create Admin Role
    const adminRoleRef = tenantDb.collection('roles').doc('admin');
    batch.set(adminRoleRef, {
        name: 'Admin',
        permissions: [
            "campaign:create", "campaign:read", "campaign:update", "campaign:delete",
            "voter:create", "voter:read", "voter:update", "voter:delete",
            "user:create", "user:read", "user:update", "user:delete",
            "role:create", "role:read", "role:update", "role:delete",
            "city:create", "city:read", "city:update", "city:delete",
            "task:create", "task:read", "task:update", "task:delete",
            "call:create", "call:read", "call:update", "call:delete",
            "report:read",
            "setting:update"
        ],
        status: 'activo'
    });
    
    // 2. Create default lists
    const defaultLists = {
        identificationTypes: { name: "Tipos de Documento", items: ['cedula_ciudadania', 'cedula_extranjeria', 'pasaporte']},
        taskPriorities: { name: "Prioridades de Tareas", items: ['normal', 'alta', 'urgente']},
        taskStatuses: { name: "Estados de Tareas", items: ['pendiente', 'en_curso', 'finalizada', 'archivada']},
        campaignTypes: { name: "Tipos de Campaña", items: ['presidencia', 'alcaldia', 'gobernacion']},
        campaignStatuses: { name: "Estados de Campaña", items: ['Futura', 'En Campaña', 'Finalizada', 'Archivada']},
    };

    for (const [key, value] of Object.entries(defaultLists)) {
        const listRef = tenantDb.collection('lists').doc(key);
        batch.set(listRef, value);
    }
    
    // 3. Create admin user profile inside the tenant's DB
    const userRef = tenantDb.collection('users').doc(adminUserId);
    batch.set(userRef, adminUser);


    await batch.commit();
    console.log(`Database ${databaseId} initialized successfully.`);
    
  } catch (error) {
    console.error(`Error initializing tenant database ${databaseId}:`, error);
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
    
    const databaseId = `(default)`; // All tenants share the default database in this architecture

    const newTenant: Tenant = {
      id: data.subdomain,
      companyName: data.companyName,
      subdomain: data.subdomain,
      plan: data.plan,
      databaseId: databaseId, // All tenants point to the default DB
      ownerUid: userRecord.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    await tenantsRef.doc(data.subdomain).set(newTenant);

    const adminProfile: Omit<User, 'id'> = {
      firstName,
      lastName,
      email: userRecord.email!,
      roleId: 'admin',
      tenantId: data.subdomain,
      idType: 'admin',
      idNumber: '00000000',
      phone: '0000000000',
      cityIds: [],
      campaignIds: [],
      avatar: `https://picsum.photos/seed/${userRecord.uid}/100/100`,
      status: 'activo',
    };
    
    // This now writes to the main DB, which seems to be the intended pattern
    await adminDb.collection('users').doc(userRecord.uid).set(adminProfile);

    // Also write default roles to the main DB if they don't exist
    const adminRoleDoc = await adminDb.collection('roles').doc('admin').get();
    if (!adminRoleDoc.exists) {
         await adminDb.collection('roles').doc('admin').set({
            name: 'Admin',
            permissions: [ "campaign:create", "campaign:read", "campaign:update", "campaign:delete", "voter:create", "voter:read", "voter:update", "voter:delete", "user:create", "user:read", "user:update", "user-delete", "role:create", "role:read", "role:update", "role:delete", "city:create", "city:read", "city:update", "city:delete", "task:create", "task:read", "task:update", "task:delete", "call:create", "call:read", "call:update", "call:delete", "report:read", "setting:update" ],
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
