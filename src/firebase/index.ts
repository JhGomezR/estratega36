'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Dev/testing only: when NEXT_PUBLIC_USE_EMULATOR=true the client talks to the
// local Firebase Emulator Suite instead of the real project. NEVER set this in
// production builds.
const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

export function initializeFirebase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { ...getSdks(app) };
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Caché en MEMORIA (no IndexedDB). La persistencia offline con IndexedDB se
  // corrompía ("refusing to open IndexedDB database due to potential
  // corruption...") y rompía al cliente de Firestore de forma intermitente
  // (síntoma: el admin del tenant veía el menú pero no podía gestionar
  // roles/usuarios/etc.). La caché en memoria elimina esa clase de fallo y
  // además quita el warning de deprecación de enableIndexedDbPersistence.
  // initializeFirestore solo puede invocarse una vez por app.
  let firestore: Firestore;
  try {
    firestore = initializeFirestore(firebaseApp, { localCache: memoryLocalCache() });
  } catch {
    firestore = getFirestore(firebaseApp);
  }
  const auth = getAuth(firebaseApp);

  if (USE_EMULATOR && typeof window !== 'undefined') {
    try {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    } catch {
      // Already connected (e.g. fast refresh) — safe to ignore.
    }
  }

  let analytics: Analytics | null = null;
  if (typeof window !== 'undefined' && !USE_EMULATOR) {
    analytics = getAnalytics(firebaseApp);
  }

  return {
    firebaseApp,
    auth,
    firestore: firestore,
    analytics
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
