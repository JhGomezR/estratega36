
'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, getSdks } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import type { Auth, User as AuthUser } from 'firebase/auth';
import type { Firestore, User } from 'firebase/firestore';
import { collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { Loader2, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { firebaseConfig } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  tenantFound: boolean;
  databaseId: string;
}

// Function to initialize a new tenant's database with default data
async function initializeNewTenantDatabase(db: Firestore, owner: AuthUser) {
    console.log("Initializing new tenant database...");
    try {
        const batch = writeBatch(db);

        // 1. Create Admin Role
        const adminRoleRef = doc(db, 'roles', 'admin');
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
        const userRef = doc(db, 'users', owner.uid);
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
            const docRef = doc(db, 'lists', key);
            batch.set(docRef, { name: listTitles[key], items: value });
        })

        await batch.commit();
        console.log("New tenant database initialized successfully.");

    } catch (error) {
        console.error("CRITICAL: Failed to initialize new tenant database:", error);
        // We should probably show a blocking error to the user here
    }
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Don't initialize firebase on public pages that don't need tenant info
    if (pathname === '/signup') {
        const app = initializeApp(firebaseConfig);
        const defaultServices = getSdks(app);
        setServices({...defaultServices, tenantFound: true, databaseId: 'default'} as FirebaseServices);
        setIsLoading(false);
        return;
    }

    const init = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // initializeFirebase finds the tenant and gets the correct databaseId
        const firebaseServices = await initializeFirebase();
        if (!firebaseServices.tenantFound) {
            const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
            setError(`No pudimos encontrar una cuenta asociada con el subdominio <code class="font-mono font-bold bg-muted p-1 rounded-sm">${hostname.split('.')[0]}</code>.<br/>Por favor, verifica la URL o contacta a soporte.`);
        } else if (firebaseServices.firestore && firebaseServices.databaseId !== 'default') {
            // Check if the tenant's database is empty and needs initialization
            const rolesCollection = collection(firebaseServices.firestore, 'roles');
            const snapshot = await getDocs(rolesCollection);
            
            if (snapshot.empty) {
                // The database is new and empty, let's populate it.
                const currentUser = firebaseServices.auth.currentUser;
                if (currentUser) {
                    await initializeNewTenantDatabase(firebaseServices.firestore, currentUser);
                } else {
                    // This is a rare edge case. The user should be logged in to trigger this.
                    console.warn("User not logged in during tenant DB initialization check. Waiting for auth state change.");
                }
            }
        }
        setServices(firebaseServices as FirebaseServices);
      } catch (err: any) {
        console.error("Failed to initialize Firebase services:", err);
        setError("Ocurrió un error al inicializar los servicios. Por favor, intenta de nuevo más tarde.");
        setServices(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // If an error occurred (like tenant not found), show error page.
  // Allow /signup to always render.
  if (error && pathname !== '/signup') {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
            <div className="container mx-auto p-4">
                <ServerCrash className="mx-auto h-24 w-24 text-destructive opacity-50" />
                <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                    Inquilino no encontrado
                </h1>
                <p className="mt-6 text-base leading-7 text-muted-foreground" dangerouslySetInnerHTML={{ __html: error }} />
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Button asChild>
                        <a href="/signup">Crear una nueva cuenta</a>
                    </Button>
                </div>
            </div>
        </div>
    );
  }
  
  if (!services) {
      if (pathname === '/signup') return <>{children}</>;
      return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}

