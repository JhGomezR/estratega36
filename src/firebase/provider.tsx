'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Analytics } from 'firebase/analytics';
import type { Tenant } from '@/lib/types';
import { getTenantFirestore, getImpersonation } from '@/firebase/tenant-db';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  analytics: Analytics | null;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Resolved custom claims for the signed-in user. */
export interface PlatformClaims {
  platformAdmin: boolean;
  tenantId?: string;
  roleId?: string;
}

/** How the active Firestore connection was resolved for this session. */
export type ConnectionScope = 'default' | 'tenant' | 'impersonation';

/** Outcome of resolving the tenant for the signed-in user. */
export type TenantResolution =
  | { state: 'idle' }
  | { state: 'resolving' }
  | { state: 'default' } // legacy user or platform admin on control plane
  | { state: 'active'; tenant: Tenant }
  | { state: 'blocked'; reason: 'inactive' | 'provisioning' | 'missing' | 'error' };

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  /** The ACTIVE Firestore connection (tenant DB when applicable, else `(default)`). */
  firestore: Firestore | null;
  /** Always the `(default)` database (Control Plane). */
  defaultDb: Firestore | null;
  auth: Auth | null;
  analytics: Analytics | null;
  // User authentication state
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  // Multi-tenant resolution
  claims: PlatformClaims | null;
  tenantResolution: TenantResolution;
  connectionScope: ConnectionScope;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  defaultDb: Firestore;
  auth: Auth;
  analytics: Analytics | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: PlatformClaims | null;
  tenantResolution: TenantResolution;
  connectionScope: ConnectionScope;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages Firebase services, auth state, and — new for
 * multi-tenancy — resolves the ACTIVE Firestore connection from the user's
 * custom claims:
 *   - platformAdmin (no impersonation) → `(default)` (Control Plane)
 *   - platformAdmin + impersonation    → the impersonated tenant DB
 *   - tenantId (active tenant)         → that tenant's named DB
 *   - no claims (legacy)               → `(default)`  [backward compatible]
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  analytics,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const [claims, setClaims] = useState<PlatformClaims | null>(null);
  const [activeFirestore, setActiveFirestore] = useState<Firestore>(firestore);
  const [connectionScope, setConnectionScope] = useState<ConnectionScope>('default');
  const [tenantResolution, setTenantResolution] = useState<TenantResolution>({ state: 'idle' });

  // Subscribe to auth state.
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error('Auth service not provided.') });
      return;
    }
    setUserAuthState({ user: null, isUserLoading: true, userError: null });
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null }),
      (error) => {
        console.error('FirebaseProvider: onAuthStateChanged error:', error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  // Resolve claims + tenant connection whenever the user changes.
  useEffect(() => {
    let cancelled = false;
    const user = userAuthState.user;

    if (!user) {
      setClaims(null);
      setActiveFirestore(firestore);
      setConnectionScope('default');
      setTenantResolution({ state: 'idle' });
      return;
    }

    setTenantResolution({ state: 'resolving' });

    (async () => {
      try {
        const tokenResult = await user.getIdTokenResult();
        if (cancelled) return;
        const resolvedClaims: PlatformClaims = {
          platformAdmin: tokenResult.claims.platformAdmin === true,
          tenantId: tokenResult.claims.tenantId as string | undefined,
          roleId: tokenResult.claims.roleId as string | undefined,
        };
        setClaims(resolvedClaims);

        const impersonated = resolvedClaims.platformAdmin ? getImpersonation() : null;

        if (impersonated) {
          setActiveFirestore(getTenantFirestore(impersonated.databaseId));
          setConnectionScope('impersonation');
          setTenantResolution({ state: 'default' });
          return;
        }

        if (resolvedClaims.tenantId) {
          const tenantSnap = await getDoc(doc(firestore, 'tenants', resolvedClaims.tenantId));
          if (cancelled) return;
          if (!tenantSnap.exists()) {
            setActiveFirestore(firestore);
            setConnectionScope('default');
            setTenantResolution({ state: 'blocked', reason: 'missing' });
            return;
          }
          const tenant = { id: tenantSnap.id, ...tenantSnap.data() } as Tenant;
          if (tenant.status === 'active' && tenant.databaseId) {
            setActiveFirestore(getTenantFirestore(tenant.databaseId));
            setConnectionScope('tenant');
            setTenantResolution({ state: 'active', tenant });
          } else {
            setActiveFirestore(firestore);
            setConnectionScope('default');
            setTenantResolution({
              state: 'blocked',
              reason: tenant.status === 'provisioning' ? 'provisioning' : 'inactive',
            });
          }
          return;
        }

        // Legacy user (no claims) or platform admin without impersonation → default.
        setActiveFirestore(firestore);
        setConnectionScope('default');
        setTenantResolution({ state: 'default' });
      } catch (error) {
        if (cancelled) return;
        console.error('FirebaseProvider: tenant resolution failed:', error);
        setActiveFirestore(firestore);
        setConnectionScope('default');
        setTenantResolution({ state: 'blocked', reason: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userAuthState.user, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? activeFirestore : null,
      defaultDb: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      analytics: servicesAvailable ? analytics : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      claims,
      tenantResolution,
      connectionScope,
    };
  }, [firebaseApp, firestore, activeFirestore, auth, analytics, userAuthState, claims, tenantResolution, connectionScope]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.defaultDb) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    defaultDb: context.defaultDb,
    auth: context.auth,
    analytics: context.analytics,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    claims: context.claims,
    tenantResolution: context.tenantResolution,
    connectionScope: context.connectionScope,
  };
};

/** Firebase Auth instance. */
export const useAuth = (): Auth => useFirebase().auth;

/** ACTIVE Firestore connection (tenant DB when applicable, else `(default)`). */
export const useFirestore = (): Firestore => useFirebase().firestore;

/** Always the `(default)` database — use in Control Plane code. */
export const useDefaultDb = (): Firestore => useFirebase().defaultDb;

/** Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

/** Resolved custom claims (platformAdmin / tenantId / roleId), or null if unknown. */
export const usePlatformClaims = (): PlatformClaims | null => useFirebase().claims;

/** Tenant resolution state for the signed-in user. */
export const useTenantResolution = (): TenantResolution => useFirebase().tenantResolution;

/**
 * Módulos habilitados por el PLAN del tenant. `null` = todos habilitados
 * (operador de plataforma / impersonación / usuario legacy / tenant sin
 * `planModules`). Un `Set` restringe a esos módulos.
 */
/**
 * Compatibilidad: los planes ANTIGUOS guardaban módulos "gruesos". Al pasar a
 * módulos individuales, un `planModules` legacy se expande a sus equivalentes
 * granulares para no dejar sin acceso a tenants ya aprovisionados. Las claves
 * nuevas se mapean a sí mismas (no aparecen aquí).
 */
const LEGACY_MODULE_EXPANSION: Record<string, string[]> = {
  voters: ['voters', 'voters_map'],
  activities: ['activities_calendar', 'activities_calls', 'activities_tasks'],
  analysis: ['analysis_campaign', 'analysis_strategies', 'analysis_social'],
  administration: ['admin_roles', 'admin_users', 'admin_cities', 'admin_forms', 'admin_settings'],
};

export const useAllowedModules = (): Set<string> | null => {
  const { claims, tenantResolution } = useFirebase();
  if (claims?.platformAdmin) return null; // control plane / impersonación → todo
  if (tenantResolution.state === 'active') {
    const pm = tenantResolution.tenant.planModules;
    if (!Array.isArray(pm)) return null; // sin plan definido → backward-compat: todo
    const expanded = new Set<string>();
    for (const key of pm) {
      expanded.add(key);
      for (const g of LEGACY_MODULE_EXPANSION[key] ?? []) expanded.add(g);
    }
    return expanded;
  }
  return null;
};

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | MemoFirebase<T> {
  const memoized = useMemo(factory, deps);
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
