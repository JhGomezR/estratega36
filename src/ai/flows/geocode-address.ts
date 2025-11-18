
'use server';

/**
 * @fileOverview A flow to geocode an address using the Google Maps Geocoding API.
 * 
 * - geocodeAddress - A function that takes an address and returns its latitude and longitude.
 * - GeocodeAddressInput - The input type for the geocodeAddress function.
 * - GeocodeAddressOutput - The return type for the geocodeAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The full address to geocode.'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

const GeocodeAddressOutputSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;


async function getGoogleMapsApiKey(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
        // In local development, use the environment variable directly
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set for local development.');
            throw new Error('API Key not configured for development');
        }
        return apiKey;
    } else {
        // In production (App Hosting), fetch from Secret Manager
        const client = new SecretManagerServiceClient();
        const secretName = 'projects/studio-8059115072-3707d/secrets/API_KEY_GOOGLE_MAPS/versions/latest';

        try {
            const [version] = await client.accessSecretVersion({ name: secretName });
            const payload = version.payload?.data?.toString();
            if (!payload) {
                throw new Error('Secret payload is empty.');
            }
            return payload;
        } catch (error) {
            console.error('Failed to access secret from Secret Manager:', error);
            throw new Error('Could not retrieve API Key from Secret Manager.');
        }
    }
}


export async function geocodeAddress(input: GeocodeAddressInput): Promise<GeocodeAddressOutput> {
  return geocodeAddressFlow(input);
}

const geocodeAddressFlow = ai.defineFlow(
  {
    name: 'geocodeAddressFlow',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async ({ address }) => {
    try {
      const apiKey = await getGoogleMapsApiKey();
      
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      } else {
        console.error(`Geocoding failed for address "${address}": ${data.status} - ${data.error_message || ''}`);
        return { latitude: undefined, longitude: undefined };
      }
    } catch (error) {
      console.error(`An error occurred during geocoding for address "${address}":`, error);
      return { latitude: undefined, longitude: undefined };
    }
  }
);
