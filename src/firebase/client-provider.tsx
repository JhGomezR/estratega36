'use client';

import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AppShell } from '@/components/layout/app-shell';
import { useToast } from '@/hooks/use-toast';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const PUBLIC_PAGES = ['/login', '/signup'];
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Custom hook to handle inactivity logout
const useInactivityTimeout = (onTimeout: () => void, timeout: number) => {
    const router = useRouter();

    const resetTimer = useCallback(() => {
        if ((window as any).inactivityTimer) {
            clearTimeout((window as any).inactivityTimer);
        }
        (window as any).inactivityTimer = setTimeout(onTimeout, timeout);
    }, [onTimeout, timeout]);

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
        
        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if ((window as any).inactivityTimer) {
                clearTimeout((window as any).inactivityTimer);
            }
        };
    }, [resetTimer, router]);
};

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = useCallback(async (isTimeout = false) => {
    if (services?.auth) {
      await signOut(services.auth);
      // setUser(null) will be handled by onAuthStateChanged
      if (isTimeout) {
         toast({
            title: "Sesión Cerrada por Inactividad",
            description: "Has sido desconectado por seguridad.",
        });
      }
      router.push('/login');
    }
  }, [services, router, toast]);

  useInactivityTimeout(() => handleLogout(true), INACTIVITY_TIMEOUT);

  useEffect(() => {
    const firebaseServices = initializeFirebase();
    setServices(firebaseServices as FirebaseServices);
  }, []);

  useEffect(() => {
    if (!services) return;

    const unsubscribe = onAuthStateChanged(services.auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [services]);

  useEffect(() => {
    if (isAuthLoading) return;

    const isPublicPage = PUBLIC_PAGES.includes(pathname);

    if (!user && !isPublicPage) {
      router.push('/login');
    }
     if (user && isPublicPage) {
      router.push('/');
    }
  }, [user, isAuthLoading, pathname, router]);

  if (isAuthLoading || (!user && !PUBLIC_PAGES.includes(pathname))) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }
  
  if (PUBLIC_PAGES.includes(pathname)) {
    return <>{children}</>;
  }


  if (!services) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      <AppShell onLogout={handleLogout}>{children}</AppShell>
    </FirebaseProvider>
  );
}
