'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { AppShell } from '@/components/layout/app-shell';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const PUBLIC_PAGES = ['/login', '/signup'];

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

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
  }, [user, isAuthLoading, pathname, router]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!user || !services) {
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
      <AppShell>{children}</AppShell>
    </FirebaseProvider>
  );
}
