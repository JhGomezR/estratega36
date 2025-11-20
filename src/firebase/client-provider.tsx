'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { AppShell } from '@/components/layout/app-shell';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const PUBLIC_PAGES = ['/login', '/signup'];

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  // Initialize Firebase services once
  useEffect(() => {
    try {
      const firebaseServices = initializeFirebase();
      setServices(firebaseServices as FirebaseServices);
    } catch (err: any) {
      console.error("Failed to initialize Firebase services:", err);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!services) return;

    const unsubscribe = onAuthStateChanged(services.auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [services]);

  // Handle routing based on auth state
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user && !isPublicPage) {
      router.push('/login');
    }
  }, [user, isAuthLoading, isPublicPage, router]);

  // Render loading state while checking auth on protected pages
  if (isAuthLoading && !isPublicPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // If on a public page, render it directly.
  if (isPublicPage) {
    return <>{children}</>;
  }
  
  // If we are on a protected page but not yet authenticated (or services not ready), show a loader.
  if (!services || !user) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }
  
  // User is authenticated, services are available, and it's a protected page.
  // Render the full app shell with Firebase context.
  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      <AppShell>{children}</AppShell>
    </FirebaseProvider>
  );
}
