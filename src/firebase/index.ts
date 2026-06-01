'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
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
  const firestore = getFirestore(firebaseApp);
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

  // Enable offline persistence
  try {
    enableIndexedDbPersistence(firestore)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one.
          // This is a common scenario and not necessarily an error.
          console.warn('Firestore persistence failed to enable. This can happen if you have multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence.
          console.warn('Firestore persistence is not supported in this browser.');
        }
      });
  } catch (error: any) {
     if (error.code !== 'failed-precondition') {
      console.error("Error enabling Firestore persistence:", error);
    }
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
