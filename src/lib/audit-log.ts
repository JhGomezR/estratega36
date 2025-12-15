
'use server'

import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { adminDb } from '@/firebase/admin';
import type { AuditLog } from '@/lib/types';
import { headers } from 'next/headers';
import fetch from 'node-fetch';

/**
 * Logs an audit event to Firestore.
 * This is a server action that captures user actions along with context like IP address and user agent.
 *
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} action - A string identifying the action (e.g., 'login', 'voter:create').
 * @param {Record<string, any>} [details] - Optional details about the event (e.g., { voterId: '...' }).
 */
export async function logAudit(userId: string, action: string, details?: Record<string, any>) {
  try {
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    // This will get the Vercel-forwarded IP in production, or the direct IP in local dev.
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

    let geoData = {};
    try {
        if (ip && ip !== '127.0.0.1') {
             const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
             if(geoResponse.ok) {
                const data = await geoResponse.json() as any;
                geoData = {
                    city: data.city,
                    country: data.country_name,
                    region: data.region,
                    latitude: data.latitude,
                    longitude: data.longitude,
                };
             }
        }
    } catch (geoError) {
        console.warn("Could not fetch geolocation data for audit log:", geoError);
    }
    
    const logEntry: AuditLog = {
      userId,
      action,
      timestamp: new Date().toISOString(),
      details,
      ipAddress: ip,
      userAgent,
      geo: geoData
    };
    
    // Using adminDb to ensure the log is always written, bypassing client-side security rules.
    await adminDb.collection('auditLogs').add(logEntry);

  } catch (error) {
    console.error('Failed to write to audit log:', error);
    // We don't re-throw the error because failing to log an audit event
    // should not block the user's primary action.
  }
}
