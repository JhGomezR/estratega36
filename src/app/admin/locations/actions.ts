'use server';

/**
 * Control Plane — catálogo de UBICACIONES (países y municipios). Se guarda en UN
 * solo documento por país `(default)/locations/{id}` con el arreglo de
 * municipios (1 lectura). Estado activo/inactivo en país y municipio: la
 * disponibilidad efectiva es `país.active && municipio.active`. Acceso por Admin
 * SDK (Server Actions), sin reglas de cliente. Requiere permiso `location:*`.
 */

import { adminDb } from '@/firebase/admin';
import { requirePlatformPermission } from '@/firebase/claims';
import { logPlatformAudit } from '@/lib/platform-audit';
import { CO_CITIES } from '@/lib/co-cities';
import municipios from '@/data/co-municipios.json';
import type { LocationCity } from '@/lib/types';

const COUNTRY_ID = 'colombia';

type Muni = { label: string; name: string; dept: string; lat: number; lng: number };

/** Siembra Colombia con todos sus municipios (una vez). Idempotente por doc. */
export async function seedColombia(input: { idToken: string }): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'location:update');
    const ref = adminDb.collection('locations').doc(COUNTRY_ID);
    if ((await ref.get()).exists) return { success: false, error: 'Colombia ya está cargada.' };
    const cities: LocationCity[] = (municipios as Muni[]).map((m) => ({
      label: m.label, name: m.name, dept: m.dept, lat: m.lat, lng: m.lng, active: true,
    }));
    await ref.set({ name: 'Colombia', active: true, cities });
    await logPlatformAudit(caller, 'location:seed', { country: COUNTRY_ID, count: cities.length });
    return { success: true, count: cities.length };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo cargar el catálogo.' };
  }
}

/** Activa/inactiva el país; CASCADA: todos sus municipios quedan igual. */
export async function setCountryActive(input: { idToken: string; active: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'location:update');
    const ref = adminDb.collection('locations').doc(COUNTRY_ID);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Colombia no está cargada.' };
    const cities = ((snap.data()?.cities || []) as LocationCity[]).map((c) => ({ ...c, active: input.active }));
    await ref.update({ active: input.active, cities });
    await logPlatformAudit(caller, 'location:country_active', { country: COUNTRY_ID, active: input.active });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo actualizar el país.' };
  }
}

/** Activa/inactiva un municipio individual. */
export async function setCityActive(input: { idToken: string; label: string; active: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requirePlatformPermission(input.idToken, 'location:update');
    const ref = adminDb.collection('locations').doc(COUNTRY_ID);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: 'Colombia no está cargada.' };
    const cities = ((snap.data()?.cities || []) as LocationCity[]).map((c) =>
      c.label === input.label ? { ...c, active: input.active } : c
    );
    await ref.update({ cities });
    await logPlatformAudit(caller, 'location:city_active', { label: input.label, active: input.active });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'No se pudo actualizar el municipio.' };
  }
}

/** Catálogo completo (para el módulo de administración). */
export async function getLocations(input: { idToken: string }): Promise<{ country?: { name: string; active: boolean; cities: LocationCity[] }; error?: string }> {
  try {
    await requirePlatformPermission(input.idToken, 'location:read');
    const snap = await adminDb.collection('locations').doc(COUNTRY_ID).get();
    if (!snap.exists) return { country: undefined };
    const d = snap.data() as { name: string; active: boolean; cities: LocationCity[] };
    return { country: { name: d.name, active: d.active, cities: d.cities || [] } };
  } catch (e: any) {
    return { error: e?.message || 'No se pudieron cargar las ubicaciones.' };
  }
}

/**
 * Municipios DISPONIBLES (país activo ∧ municipio activo) para el selector de
 * tenant y el mapa. Si aún no se ha sembrado el catálogo, cae en el diccionario
 * estático `CO_CITIES` (para no dejar la app sin ciudades antes de sembrar).
 */
export async function getActiveCities(input: { idToken: string }): Promise<{ cities: { label: string; lat: number; lng: number }[]; seeded: boolean }> {
  try {
    await requirePlatformPermission(input.idToken, 'location:read');
    const snap = await adminDb.collection('locations').doc(COUNTRY_ID).get();
    if (!snap.exists) {
      const fallback = Object.entries(CO_CITIES).map(([label, [lng, lat]]) => ({ label, lat, lng }));
      return { cities: fallback, seeded: false };
    }
    const d = snap.data() as { active: boolean; cities: LocationCity[] };
    const cities = d.active
      ? (d.cities || []).filter((c) => c.active).map((c) => ({ label: c.label, lat: c.lat, lng: c.lng }))
      : [];
    return { cities, seeded: true };
  } catch {
    return { cities: [], seeded: false };
  }
}
