
'use client';

import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { FirebaseProvider, useFirebase } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { AppShell } from '@/components/layout/app-shell';
import { useToast } from '@/hooks/use-toast';
import { Analytics } from 'firebase/analytics';
import { Button } from '@/components/ui/button';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  analytics: Analytics | null;
}

const PUBLIC_PAGES = ['/login', '/signup'];
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

const useInactivityTimeout = (onTimeout: () => void, timeout: number) => {
  const router = useRouter();
  const resetTimer = useCallback(() => {
    if ((window as any).inactivityTimer) clearTimeout((window as any).inactivityTimer);
    (window as any).inactivityTimer = setTimeout(onTimeout, timeout);
  }, [onTimeout, timeout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    const handleActivity = () => resetTimer();
    events.forEach((event) => window.addEventListener(event, handleActivity));
    resetTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if ((window as any).inactivityTimer) clearTimeout((window as any).inactivityTimer);
    };
  }, [resetTimer, router]);
};

const FullScreenLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-10 w-10 animate-spin" />
  </div>
);

function BlockedScreen({ reason, onLogout }: { reason: string; onLogout: () => void }) {
  const messages: Record<string, { title: string; body: string }> = {
    inactive: { title: 'Cuenta suspendida', body: 'El acceso de tu organización está temporalmente desactivado. Contacta al administrador de la plataforma.' },
    provisioning: { title: 'Cuenta en preparación', body: 'Tu espacio de trabajo se está creando. Inténtalo de nuevo en unos minutos.' },
    missing: { title: 'Sin organización asignada', body: 'Tu usuario no está asignado a ninguna organización activa.' },
    error: { title: 'No se pudo cargar tu organización', body: 'Ocurrió un problema al resolver tu cuenta. Intenta nuevamente.' },
  };
  const m = messages[reason] || messages.error;
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">{m.title}</h1>
      <p className="max-w-md text-muted-foreground">{m.body}</p>
      <Button variant="outline" onClick={onLogout}>Cerrar sesión</Button>
    </div>
  );
}

function AuthGate({ children, onLogout }: { children: ReactNode; onLogout: () => void }) {
  const { user, isUserLoading, claims, tenantResolution, connectionScope } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PAGES.includes(pathname);
  // Control Plane = /admin y /admin/*. OJO: NO usar startsWith('/admin') a secas,
  // porque '/administration/...' (administración del TENANT) también empieza con
  // "/admin" y quedaría bloqueado, redirigiendo al admin del tenant al dashboard.
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isPlatformAdmin = claims?.platformAdmin === true;
  const isImpersonating = connectionScope === 'impersonation';
  // While signed in, wait until claims/tenant have been resolved before routing.
  const stillResolving = !!user && (tenantResolution.state === 'idle' || tenantResolution.state === 'resolving');

  useEffect(() => {
    if (isUserLoading || stillResolving) return;

    if (!user && !isPublic) {
      router.push('/login');
      return;
    }
    if (user && isPublic) {
      router.push(isPlatformAdmin && !isImpersonating ? '/admin' : '/');
      return;
    }
    // Platform operators belong in /admin (unless they explicitly entered a tenant).
    if (user && isPlatformAdmin && !isImpersonating && !isAdminPath) {
      router.push('/admin');
      return;
    }
    // Non-platform users may not access the Control Plane.
    if (user && !isPlatformAdmin && isAdminPath) {
      router.push('/');
    }
  }, [user, isUserLoading, stillResolving, isPublic, isAdminPath, isPlatformAdmin, isImpersonating, router]);

  if (isUserLoading || (!user && !isPublic) || stillResolving) {
    return <FullScreenLoader />;
  }

  if (isPublic) {
    return <>{children}</>;
  }

  // A tenant user whose tenant is not active.
  if (tenantResolution.state === 'blocked') {
    return <BlockedScreen reason={tenantResolution.reason} onLogout={onLogout} />;
  }

  // Control Plane pages render their own chrome (src/app/admin/layout.tsx).
  if (isAdminPath && isPlatformAdmin) {
    return <>{children}</>;
  }

  return <AppShell onLogout={onLogout}>{children}</AppShell>;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const firebaseServices = initializeFirebase();
    setServices(firebaseServices as FirebaseServices);
  }, []);

  const handleLogout = useCallback(
    async (isTimeout = false) => {
      if (services?.auth) {
        await signOut(services.auth);
        if (isTimeout) {
          toast({ title: 'Sesión Cerrada por Inactividad', description: 'Has sido desconectado por seguridad.' });
        }
        router.push('/login');
      }
    },
    [services, router, toast]
  );

  useInactivityTimeout(() => handleLogout(true), INACTIVITY_TIMEOUT);

  if (!services) {
    return <FullScreenLoader />;
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
      analytics={services.analytics}
    >
      <AuthGate onLogout={() => handleLogout()}>{children}</AuthGate>
    </FirebaseProvider>
  );
}
