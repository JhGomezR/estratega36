/**
 * @fileoverview Server-only helpers around the Google Cloud APIs needed to
 * provision a tenant: creating a **named Firestore database** and deploying
 * its security rules. The Firebase Admin SDK does NOT create databases, so we
 * call the REST APIs directly, authenticating with the service account in
 * `FIREBASE_SERVICE_ACCOUNT_KEY` when present and falling back to Application
 * Default Credentials otherwise (see `createGoogleAuth`).
 *
 * APIs used:
 *  - Firestore Admin API   (firestore.googleapis.com)      → create database
 *  - Firebase Rules API    (firebaserules.googleapis.com)  → deploy rules
 *
 * NOTE: must run server-side only. Requires the service account to have
 * `Cloud Datastore Owner` (or `datastore.databases.create`) and
 * `Firebase Rules Admin` IAM roles. Verify endpoint shapes against the live
 * API during staging — these are intentionally explicit for reviewability.
 */

import { GoogleAuth } from 'google-auth-library';
import { adminApp } from '@/firebase/admin';

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

/**
 * Builds the GoogleAuth client.
 *
 * The Docker deployment (see `docker-compose.yml`) only injects
 * `FIREBASE_SERVICE_ACCOUNT_KEY` — the service account JSON on a single line —
 * which is NOT part of the Application Default Credentials chain
 * (`GOOGLE_APPLICATION_CREDENTIALS` file path / GCE metadata server). Relying on
 * ADC alone there fails with "No se pudo obtener un access token de GCP", so we
 * feed those credentials explicitly when present and fall back to ADC otherwise
 * (local dev with a key file, or Cloud Run / GCE with a metadata server).
 */
function createGoogleAuth(): GoogleAuth {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) {
    try {
      return new GoogleAuth({ credentials: JSON.parse(raw), scopes: SCOPES });
    } catch (err) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY no contiene un JSON válido de cuenta de servicio.'
      );
    }
  }
  return new GoogleAuth({ scopes: SCOPES });
}

// Perezoso: un JSON malformado no debe reventar la carga del módulo, solo la
// operación de provisioning que realmente necesita credenciales.
let authClient: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!authClient) authClient = createGoogleAuth();
  return authClient;
}

/** Resolves the active GCP project id from the Admin app / environment. */
export function getProjectId(): string {
  const pid =
    adminApp.options.projectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID;
  if (!pid) throw new Error('No se pudo resolver el projectId de GCP.');
  return pid;
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<any> {
  const token = await getAuth().getAccessToken();
  if (!token) throw new Error('No se pudo obtener un access token de GCP.');
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = body?.error?.message || res.statusText;
    throw new Error(`GCP API ${res.status}: ${message}`);
  }
  return body;
}

/**
 * Creates a named Firestore database in Native mode. Returns the long-running
 * operation name; the database is NOT usable until the operation completes
 * (see waitForOperation).
 *
 * @param databaseId e.g. "tenant-acme" (a–z, 0–9, '-', 4–63 chars)
 * @param locationId Firestore location, e.g. "nam5", "eur3", "us-east1".
 *                   MUST match the project's existing region constraints.
 */
export async function createFirestoreDatabase(
  databaseId: string,
  locationId: string
): Promise<string> {
  const projectId = getProjectId();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=${encodeURIComponent(
    databaseId
  )}`;
  const op = await authedFetch(url, {
    method: 'POST',
    body: JSON.stringify({
      type: 'FIRESTORE_NATIVE',
      locationId,
      concurrencyMode: 'OPTIMISTIC',
    }),
  });
  if (!op?.name) throw new Error('createDatabase no devolvió un nombre de operación.');
  return op.name as string;
}

/**
 * Polls a long-running operation until it completes or times out.
 * @param operationName full operation resource name returned by create*.
 */
export async function waitForOperation(
  operationName: string,
  { timeoutMs = 120_000, intervalMs = 4_000 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const op = await authedFetch(`https://firestore.googleapis.com/v1/${operationName}`);
    if (op?.done) {
      if (op.error) {
        throw new Error(`La operación falló: ${op.error.message || JSON.stringify(op.error)}`);
      }
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(`Timeout esperando la operación ${operationName}.`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Deploys Firestore security rules to a specific database via the Firebase
 * Rules API: creates a ruleset, then points the database's release at it.
 *
 * Release naming: the `(default)` database uses `cloud.firestore`; named
 * databases use `cloud.firestore/{databaseId}`.
 */
export async function deployFirestoreRules(databaseId: string, rulesSource: string): Promise<void> {
  const projectId = getProjectId();

  // 1) Create a ruleset.
  const ruleset = await authedFetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: 'POST',
      body: JSON.stringify({
        source: { files: [{ name: 'firestore.rules', content: rulesSource }] },
      }),
    }
  );
  if (!ruleset?.name) throw new Error('No se pudo crear el ruleset.');

  // 2) Point the database release at the new ruleset (create or update).
  const releaseLeaf =
    databaseId === '(default)' ? 'cloud.firestore' : `cloud.firestore/${databaseId}`;
  const releaseName = `projects/${projectId}/releases/${releaseLeaf}`;

  try {
    await authedFetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
      method: 'POST',
      body: JSON.stringify({ name: releaseName, rulesetName: ruleset.name }),
    });
  } catch (err: any) {
    // Already exists → update it instead.
    if (String(err?.message || '').includes('409') || String(err?.message || '').toLowerCase().includes('already exists')) {
      await authedFetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
        method: 'PATCH',
        body: JSON.stringify({ release: { name: releaseName, rulesetName: ruleset.name } }),
      });
    } else {
      throw err;
    }
  }
}
