
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, Firestore } from 'firebase/firestore'
import type { Tenant } from '@/lib/types';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebase() {
  const isServer = typeof window === 'undefined';
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const defaultDb = getFirestore(app);

  if (isServer) {
    // On the server, we don't have a hostname, so we connect to the default DB for admin tasks
    return { ...getSdks(app), tenantFound: false, tenantId: null };
  }

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  const isDevEnvironment = hostname.includes('localhost') || hostname.includes('cloudworkstations.dev') || hostname.includes('.web.app');
  const subdomain = isDevEnvironment && parts.length <= 2 ? 'ardila' : (parts.length > 2 ? parts[0] : null);


  if (!subdomain) {
      return { ...getSdks(app), tenantFound: false, tenantId: null };
  }

  const tenantsRef = collection(defaultDb, 'tenants');
  const q = query(tenantsRef, where("subdomain", "==", subdomain));

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.error(`Tenant with subdomain "${subdomain}" not found.`);
      return { ...getSdks(app), tenantFound: false, tenantId: null };
    }
    
    // In a shared DB model, we always use the default firestore instance
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: defaultDb,
      tenantFound: true,
      tenantId: subdomain,
    };

  } catch (error) {
    console.error("Error fetching tenant data:", error);
    return { ...getSdks(app), tenantFound: false, tenantId: null };
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
