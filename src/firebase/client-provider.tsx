
'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const firebaseServices = await initializeFirebase();
        if (!firebaseServices.tenantFound) {
            const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
            setError(`No pudimos encontrar una cuenta asociada con el subdominio <code class="font-mono font-bold bg-muted p-1 rounded-sm">${hostname}</code>.<br/>Por favor, verifica la URL o contacta a soporte.`);
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error) {
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
      return null; // Should not happen if error is handled
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
