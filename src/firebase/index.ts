'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, Firestore } from 'firebase/firestore'
import type { Tenant } from '@/lib/types';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebase() {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    // On the server, we don't have a hostname, so we connect to the default DB for admin tasks
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getSdks(app);
  }

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Assuming a structure like subdomain.domain.com or localhost
  const isLocalhost = hostname.includes('localhost');
  const subdomain = isLocalhost ? 'ardila' : (parts.length > 2 ? parts[0] : null);


  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  if (!subdomain) {
      // This is the main domain (e.g., estratega360.com) or an invalid setup
      // We can decide what to do here, maybe show a generic page or error
      // For now, we connect to default but mark it as tenant not found.
      return { ...getSdks(app), tenantFound: false, databaseId: 'default' };
  }

  // Connect to the 'default' database to find the tenant info
  const defaultDb = getFirestore(app);
  const tenantsRef = collection(defaultDb, 'tenants');
  const q = query(tenantsRef, where("subdomain", "==", subdomain));

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.error(`Tenant with subdomain "${subdomain}" not found.`);
      return { ...getSdks(app), tenantFound: false, databaseId: 'default' };
    }

    const tenantData = querySnapshot.docs[0].data() as Tenant;
    const { databaseId } = tenantData;

    // Now, get the specific firestore instance for this tenant
    const tenantFirestore = getFirestore(app, databaseId);
    
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: tenantFirestore,
      tenantFound: true,
      databaseId: databaseId,
    };

  } catch (error) {
    console.error("Error fetching tenant data:", error);
    return { ...getSdks(app), tenantFound: false, databaseId: 'default' };
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    tenantFound: true, // Assume tenant is found for default server-side connections
    databaseId: 'default',
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';