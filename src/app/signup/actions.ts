
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

async function initializeTenantData(tenantId: string, owner: { uid: string, email: string, displayName: string | null}) {
    console.log(`Initializing data for new tenant: ${tenantId}`);
    try {
        const batch = adminDb.batch();

        const tenantRoot = adminDb.collection('tenants').doc(tenantId);

        // 1. Create Admin Role
        const adminRoleRef = tenantRoot.collection('roles').doc('admin');
        batch.set(adminRoleRef, {
            name: 'Admin',
            permissions: [ "campaign:create", "campaign:read", "campaign:update", "campaign:delete", "voter:create", "voter:read", "voter:update", "voter:delete", "user:create", "user:read", "user:update", "user:delete", "role:create", "role:read", "role:update", "role:delete", "city:create", "city:read", "city:update", "city:delete", "task:create", "task:read", "task:update", "task:delete", "call:create", "call:read", "call:update", "call:delete", "report:read", "setting:update" ],
            status: 'activo'
        });
        
        // 2. Create Admin User Profile
        const [firstName, ...lastNameParts] = (owner.displayName || 'Admin').split(' ');
        const adminProfile: Omit<User, 'id'> = {
            firstName,
            lastName: lastNameParts.join(' '),
            email: owner.email!,
            roleId: 'admin',
            idType: 'admin',
            idNumber: '00000000',
            phone: '0000000000',
            cityIds: [],
            campaignIds: [],
            avatar: `https://picsum.photos/seed/${owner.uid}/100/100`,
            status: 'activo',
        };
        const userRef = tenantRoot.collection('users').doc(owner.uid);
        batch.set(userRef, adminProfile);

        // 3. Create default managed lists
        const defaultLists = {
            campaignStatuses: ['Futura', 'En Campaña', 'Finalizada', 'Archivada'],
            taskPriorities: ['normal', 'alta', 'urgente'],
            taskStatuses: ['pendiente', 'en_curso', 'finalizada', 'archivada'],
            identificationTypes: ['cedula_ciudadania', 'cedula_extranjeria', 'pasaporte'],
            campaignTypes: ['presidencia', 'alcaldia', 'gobernacion'],
        };
        const listTitles: Record<string, string> = {
            identificationTypes: "Tipos de Documento",
            taskPriorities: "Prioridades de Tareas",
            taskStatuses: "Estados de Tareas",
            campaignTypes: "Tipos de Campaña",
            campaignStatuses: "Estados de Campaña",
        };

        Object.entries(defaultLists).forEach(([key, value]) => {
            const docRef = tenantRoot.collection('lists').doc(key);
            batch.set(docRef, { name: listTitles[key], items: value });
        })

        await batch.commit();
        console.log("Tenant data initialized successfully.");

    } catch (error) {
        console.error("CRITICAL: Failed to initialize tenant data:", error);
        throw new Error("Failed to initialize tenant data. The user was created, but the tenant setup failed.");
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

    // 1. Create Auth user (global for the project)
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
      emailVerified: false,
      disabled: false,
    });
    
    // 2. Create the tenant document in the 'default' database
    const newTenant: Omit<Tenant, 'id'> = {
      companyName: data.companyName,
      subdomain: data.subdomain,
      plan: data.plan,
      databaseId: '(default)', // All tenants use the default database
      ownerUid: userRecord.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    await tenantsRef.doc(data.subdomain).set(newTenant);
    
    // 3. Initialize the tenant's data within subcollections
    await initializeTenantData(data.subdomain, userRecord);

    return { success: true };
  } catch (error: any) {
    console.error('Error creating tenant and user:', error);

    let errorMessage = error.message || 'Ocurrió un error desconocido durante la creación de la cuenta.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El correo electrónico ya está en uso por otra cuenta.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 8 caracteres.';
    } else if (error.code?.includes('PERMISSION_DENIED') || error.code?.includes('forbidden')) {
      errorMessage = `Error de permisos: La cuenta de servicio del servidor no tiene los permisos necesarios para crear un usuario de autenticación. Por favor, revisa la configuración IAM de tu proyecto de Google Cloud. Error original: ${error.message}`;
    }

    return { success: false, error: errorMessage };
  }
}
