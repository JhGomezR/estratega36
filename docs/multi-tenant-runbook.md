# Runbook — Migración a SaaS multi-tenant (DB por tenant + Control Plane)

> Estado: **en progreso**. Plan completo en `~/.claude/plans/actua-como-un-arquitecto-greedy-mango.md`.
> Este runbook cubre lo que **NO** debe ejecutarse a ciegas contra producción.

## Modelo objetivo (resumen)
- **Control Plane → base `(default)`**: `tenants`, `platformUsers`, `platformRoles`, `platformStats`, `auditLogs`.
- **Data Plane → una base nombrada por tenant** (`databaseId`): colecciones de negocio actuales.
- **Resolución de tenant** por custom claims: `{ platformAdmin }` o `{ tenantId, roleId }`. Sin subdominio.

## Backbone ya implementado (aditivo, NO activo en producción)
| Pieza | Archivo | Estado |
|------|---------|--------|
| Tipos de plataforma + Tenant extendido | `src/lib/types.ts` | ✅ |
| Helpers de custom claims (Admin SDK) | `src/firebase/claims.ts` | ✅ |
| `getTenantDb(databaseId)` (Admin) | `src/firebase/admin.ts` | ✅ |
| `getTenantFirestore(databaseId)` (cliente) | `src/firebase/tenant-db.ts` | ✅ |
| Plantilla de reglas de tenant | `firestore.tenant.rules` | ✅ (no desplegada) |
| Reglas de control plane | `firestore.control-plane.rules` | ✅ (no desplegada) |
| Helpers GCP (crear DB + desplegar reglas) | `src/firebase/gcp-firestore-admin.ts` | ✅ (sin invocar) |
| Acciones de ciclo de vida del tenant | `src/app/admin/tenants/actions.ts` | ✅ (sin UI que las llame) |
| Script de migración (default → tenant DB) | `scripts/migrate-default-to-tenant.ts` | ✅ (ejecución manual) |

> Nada de lo anterior cambia el comportamiento productivo todavía: la conexión viva sigue usando `(default)` y las reglas desplegadas (`firestore.rules`) no se han tocado salvo el fix de Fase 0 en `settings`. Las acciones de provisioning no tienen aún quién las invoque (la UI del Control Plane y el wireo del provider son el siguiente incremento).

## Prerrequisitos de STAGING (bloquea todo lo demás)
Hoy **solo existe producción**. Antes de wirear conexión/migración hay que:
1. Crear un **proyecto Firebase de staging** independiente del productivo.
2. Habilitar **Firestore Admin API** y **Firebase Rules API** en ese proyecto.
3. Crear una **service account** con roles IAM mínimos:
   - `Cloud Datastore Owner` / `Firebase Rules Admin` (crear DBs y desplegar reglas).
   - `Firebase Authentication Admin` (crear usuarios y setear custom claims).
4. Configurar credenciales locales (`GOOGLE_APPLICATION_CREDENTIALS`) y `.env` de staging.
5. ~~BLOQUEADOR `npm install`~~ **RESUELTO**: migrado a **genkit 1.x** (`genkit ^1.20`, `@genkit-ai/google-genai`); `npm install` y `npm run typecheck` (0 errores) funcionan. Faltaban además `next-themes` y `react-day-picker` (añadidos). Configurar credenciales locales (`GOOGLE_APPLICATION_CREDENTIALS`) y `.env` de staging.

## Estado de implementación (código)
- ✅ **Fase 4 — `provisionTenant()`** (`src/app/admin/tenants/actions.ts`): crea DB → reglas → seed → usuario admin + claims → `tenants/{id}`. Estados `provisioning|active|failed`.
- ✅ **Fase 2 (wiring)** (`provider.tsx`, `client-provider.tsx`): resuelve claims → conexión a tenant DB / `(default)`, **backward-compatible** (legacy sin claims sigue en `(default)`); `AuthGate` enruta `platformAdmin → /admin` y bloquea tenants inactivos. `usePermissions` usa claim `platformAdmin` (sin email hardcodeado, también removido de `voters`/`users`).
- ✅ **Fase 3 — Control Plane UI** (`src/app/admin/**`): tenants (alta/branding/activar/entrar), platformUsers, platformRoles, stats.
- ✅ **Fase 6 — server actions endurecidas**: `createUser`, `saveGeneratedStrategy` verifican ID token + permisos (`src/firebase/authz.ts`) y escopan a la DB del llamante; registro público (`createTenantAndUser`) deshabilitado.
- ✅ **Fase 7**: fix import `City`; eliminado `app/` raíz (forms **reubicada** en `src/app/administration/forms/`) y `src/firestore.rules`; `maxInstances`→5; nota Secret Manager. **Migración genkit 0.5→1.x completada**, `tsc` con **0 errores**, y `typescript.ignoreBuildErrors` puesto en **`false`** (el build ya valida tipos). Pendiente menor: configurar ESLint y quitar `eslint.ignoreDuringBuilds`.

## Pruebas ejecutadas
- ✅ **Unitarias + integración (Jest)**: **26 tests, 5 suites, todas pasan**.
  - Unitarias: `authz` (scope platform/tenant/legacy, wildcard rol admin, rechazo de claim de tenant sin registro), `slugify`, `cn`.
  - Integración (server actions con fronteras mockeadas): `provisionTenant` (rechazo de no-platform, input inválido, duplicado, happy-path con DB+reglas+seed+claims+estado active, ruta de fallo → estado failed) y `createUser` (enforcement de `user:create`, token inválido, escritura al scope correcto, password requerido).
  - Se usa **Jest+Babel** (JS puro): la máquina tiene **WDAC** que bloquea binarios nativos (Vitest/rollup falla).
- ✅ **Build de producción (`next build`)**: 28 rutas compilan con verificación de tipos activa. Requirió externalizar paquetes server-only en `next.config.js` (`serverComponentsExternalPackages`) por un bug de bundling ESM de `@genkit-ai/google-genai`.
- ✅ **Carga / estrés (web tier)**: `autocannon` contra `next start` (`/login`, sirve HTML/JS, no toca Firestore). 50 conexiones/15s → ~318 req/s, p99 309 ms, **0 errores**. 200 conexiones/10s → ~323 req/s (techo de la instancia), p99 937 ms, **0 errores, sin caídas** (degradación elegante). Mide solo el tier web de una instancia dev; el tier de datos (Firestore) no se midió.
- ✅ **Reglas de seguridad (emulador Firestore, JDK 26)**: **15/15 pasan**. `scripts/rules-test.mjs` (JS puro) + `@firebase/rules-unit-testing` vía `npm run test:rules`. Valida contra el motor real de reglas: **aislamiento entre tenants** (un tenant no ve datos de otro), **RBAC por claims** (admin=total, viewer=solo lo permitido, lectura del propio usuario), denegación a no autenticados, y control plane (solo `platformAdmin` escribe; usuario de tenant solo lee su propio doc de tenant).
- ✅ **E2E funcional**: (a) **smoke HTTP** de 24 rutas contra el build de producción → todas 200, **0 errores 5xx** (ningún render server-side revienta). (b) **journey de datos** (`npm run test:e2e`, emulador) → 6 pasos OK: crear campaña → leer de vuelta → actualizar → crear votantes → listar → borrar, a través del motor real de reglas como usuario de tenant autenticado. Emulador cableado en `src/firebase/index.ts` vía `NEXT_PUBLIC_USE_EMULATOR` (apagado en prod). *Nota: E2E con navegador real (Playwright) queda para staging por WDAC.*
- ✅ **Pentest / DAST-lite**: sondeo HTTP del build de producción. **Hallazgo**: faltaban TODAS las cabeceras de seguridad y se filtraba `X-Powered-By`. **Remediado** en `next.config.js` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS + `poweredByHeader:false`) y **verificado** (re-sondeo: presentes). Pendiente: definir un **CSP** (requiere allow-list de Maps/Firebase/amCharts y prueba en navegador). DAST profundo (ZAP) en staging.

## Pendiente (requiere staging / entorno)
1. Configurar ESLint + `npm run lint` y poner `eslint.ignoreDuringBuilds: false`.
2. Wirear el **branding por tenant** en la app (leer `tenants/{id}.branding`) y quitar su edición desde el tenant.
3. Probar `provisionTenant` end-to-end y el **cutover de migración** (abajo).
4. (Opcional) Validar un `next build` completo en staging.

## Cutover de PRODUCCIÓN (orden estricto, con ventana de mantenimiento)
> ⚠️ Acoplado: NO desplegar la conexión multi-DB ni las reglas claims-based a producción hasta completar la migración, o los usuarios actuales (sin claims/sin DB) quedan bloqueados.
1. **Backup**: export completo de `(default)` (PITR / export a GCS).
2. Crear la DB nombrada del **primer tenant** (la data actual) y desplegar `firestore.tenant.rules`.
3. **Migrar** colecciones de negocio de `(default)` → DB del tenant (script `scripts/migrate-default-to-tenant.ts`, por lotes).
4. **Setear claims** (`tenantId`, `roleId`) a todos los usuarios existentes en Auth.
5. Crear `tenants/{id}` en `(default)` con branding actual; desplegar `firestore.control-plane.rules` a `(default)`.
6. Desplegar el build con la **conexión multi-DB** activada.
7. Verificar (ver "Verificación" en el plan); luego **vaciar** colecciones de negocio de `(default)`.
8. Plan de rollback: re-apuntar conexión a `(default)` + restaurar reglas previas si algo falla antes del paso 7.

## Notas
- Tope Firestore: **100 DBs/proyecto** (default). Escala objetivo <50 ⇒ holgado.
- `firebase.json` necesitará **targets de base de datos** para desplegar reglas/índices por DB.
- Confirmar soporte multi-DB del Admin SDK instalado (recomendado actualizar `firebase-admin`).
