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

## Cutover de PRODUCCIÓN — ejecución concreta (tenant `carolina`)

> Estado a 2026-07-24: **preparado y probado, NO ejecutado.** Inventario y respaldo
> de producción hechos. El script `.claude/cutover.mjs` (fuera del repo, junto a
> la service account) orquesta las fases; ver `.claude/` para los guiones reales.

**Hechos comprobados sobre producción** (`studio-8059115072-3707d`, única base `(default)` en `us-central1`):
- 1.354 votantes reales, 1.354 llamadas, 88 perfiles `users/`, 81 cuentas Auth, **ninguna con custom claims**.
- `axdrcys@gmail.com` es admin SOLO por el email hardcodeado; **no** tiene el claim `platformAdmin`.
- Conciliación: **78 perfiles listos** para claims; 10 perfiles sin cuenta Auth y 3 cuentas Auth sin perfil (2 demo + 1 deshabilitada) → se excluyen. 0 votantes con promotor huérfano, 0 roles inválidos.
- Colecciones que el script `.ts` original omitía y SÍ existen: `audit_logs` (1917), `routes` (1), `sms_messages` (4).
- **Fuga**: `settings/smsApi` (token LabsMobile) y `settings/socialApi` (token Facebook) eran legibles por cualquier autenticado → cerrado en el ruleset transitorio.

**Orden de fases** (cada una idempotente y con `--dry-run`; todas probadas en dry-run):
1. **Backup** — hecho: `D:\ESTRATEGA\backup-produccion-2026-07-23` (14 colecciones + 81 cuentas Auth). En prod real, además PITR/export a GCS.
2. **Consolidar auditoría** `audit_logs` → `auditLogs` en `(default)` (`scripts/consolidate-audit-logs.ts`). Prerrequisito de la migración.
3. **`create-db`** — crea `tenant-carolina` en `us-central1` (misma región).
4. **`migrate`** — copia las 16 colecciones de negocio + geografía a `tenant-carolina`, con verificación de conteos y guardia anti-pérdida.
5. **`register`** — crea `tenants/carolina` (status `active`, branding copiado de `settings/branding`).
6. **`claims`** — `platformAdmin` a `axdrcys@gmail.com`; `{tenantId:'carolina', roleId}` a los 78 usuarios; **revoca sesiones** (todos re-loguean una vez).
7. **`rules`** — despliega `firestore.tenant.rules` (con `__TENANT_ID__`→`carolina`) a `tenant-carolina`, y el ruleset de control plane a `(default)`.
8. **Redespliegue de la app** (main ya trae el provider multi-DB) — lo hace el usuario tras subir a GitHub.
9. **`verify`** — conteos origen/destino, existencia del tenant, reparto de claims, releases de reglas activos.
10. **Vaciado** de las colecciones de negocio de `(default)` — paso final, manual, SOLO tras verificar todo.

**Rollback**: mientras no se vacíe `(default)` (paso 10), revertir es re-desplegar `firestore.rules` original y limpiar claims (`revokeRefreshTokens`). Los datos siguen intactos en ambas bases.

## Cutover histórico (plantilla genérica, sin ventana forzada gracias al ruleset transitorio)
1. **Backup**: export completo de `(default)` (PITR / export a GCS).
2. **Consolidar auditoría** en `(default)`: `audit_logs` → `auditLogs` (ver sección siguiente). Bloquea el paso 4.
3. Crear la DB nombrada del **primer tenant** (la data actual) y desplegar `firestore.tenant.rules`.
4. **Migrar** colecciones de negocio de `(default)` → DB del tenant (script `scripts/migrate-default-to-tenant.ts`, por lotes).
5. **Setear claims** (`tenantId`, `roleId`) a todos los usuarios existentes en Auth.
6. Crear `tenants/{id}` en `(default)` con branding actual; desplegar el ruleset transitorio (o el de control plane) a `(default)`.
7. Desplegar el build con la **conexión multi-DB** activada.
8. Verificar (ver "Verificación" en el plan); luego **vaciar** colecciones de negocio de `(default)`.
9. Plan de rollback: re-apuntar conexión a `(default)` + restaurar reglas previas si algo falla antes del paso 8.

## Consolidación de auditoría (`audit_logs` → `auditLogs`)
> Estado: **código listo, NO ejecutado contra producción**.

**Colección canónica: `auditLogs`.** Motivo: es la que escribe `src/lib/audit-log.ts`, la única cubierta por `firestore.tenant.rules` y `firestore.control-plane.rules`, y la que tiene índices en `firestore.indexes.json`. `audit_logs` solo está protegida por el parche transitorio de `firestore.default-transitional.rules`.

**Los esquemas difieren** (el histórico lo escribió un logger de cliente ya eliminado, commit `2a1bcff`):

| `audit_logs` (legacy) | → `auditLogs` (canónico) |
|---|---|
| `eventType` + `collectionName` | `action` (`voter:create`, `user:login`, …) |
| `userEmail` | `userEmail` (campo opcional nuevo en `AuditLog`) |
| `documentId`, `eventType`, `collectionName` | `legacy.*` (se conservan íntegros) |
| `details.userAgent` | `userAgent` (promovido; sigue también en `details`) |
| `timestamp` (ISO/Date/Timestamp) | `timestamp` (ISO 8601) |
| claves desconocidas | `legacy.extra` (cero pérdida) |

La traducción vive en `src/lib/audit-log-normalize.ts` (módulo puro, con tests en `src/lib/audit-log-normalize.test.ts`). Cada entrada copiada lleva `source: 'legacy:audit_logs'`, lo que hace la copia **verificable** y **idempotente**.

Procedimiento:
```bash
# 1. Dry-run SIEMPRE primero: informe de esquema, sin escribir nada.
GOOGLE_APPLICATION_CREDENTIALS=./sa.json npx tsx scripts/consolidate-audit-logs.ts --dry-run
# 2. Revisar el informe (acciones derivadas, anomalías, colisiones de id).
# 3. Ejecutar de verdad (con backup/PITR reciente).
GOOGLE_APPLICATION_CREDENTIALS=./sa.json npx tsx scripts/consolidate-audit-logs.ts
```
- Sin `--database` opera sobre `(default)`, que es donde está el histórico; acepta `--database <id>` por si hiciera falta repetirlo en una base de tenant.
- **No borra nada** de `audit_logs`. Vaciarla/eliminarla y quitar su bloque de `firestore.default-transitional.rules` es un paso posterior y deliberado, tras verificar conteos.
- Si un id ya existe en `auditLogs` **sin** la marca legacy (entrada nativa), el script lo **salta y lo reporta** en vez de sobrescribir auditoría real; sale con código 2.
- `scripts/migrate-default-to-tenant.ts` ya no migra `audit_logs`: comprueba que esté consolidada y **aborta (código 3)** si no lo está.

## Corrección de bloqueantes (iteración actual)
1. **Claims al crear usuarios** — `createUser` (`src/app/administration/users/actions.ts`) ahora asigna `{tenantId, roleId}` al nuevo usuario cuando el llamante opera dentro de un tenant. Si el seteo falla, **revierte** borrando la cuenta de Auth. El `tenantId` sale de `CallerContext`, nunca del formulario.
2. **Impersonación operativa** — `firestore.tenant.rules` acepta `platformAdmin` como bypass (⚠️ acceso total a TODAS las bases de tenant); `getCallerContext(idToken, impersonatedTenantId?)` resuelve la base del tenant impersonado **desde `tenants/{id}`** (nunca un `databaseId` crudo del cliente); banner `src/components/layout/impersonation-banner.tsx` con botón "Salir del tenant"; sessionStorage guarda `tenantId` + `databaseId` + nombre.
3. **`logAudit` autenticado** — firma `logAudit(idToken, action, details?, impersonatedTenantId?)`; el `uid` sale del token verificado y el registro se escribe en la base del llamante. Los llamadores de cliente usan el puente `src/lib/audit-log-client.ts` (`logAuditEvent(user, action, details)`).
4. **Provisioning en Docker** — `gcp-firestore-admin.ts` construye `GoogleAuth` con `FIREBASE_SERVICE_ACCOUNT_KEY` si existe (lo único que inyecta `docker-compose.yml`), con ADC como fallback.
5. **Reglas/índices por base** — `firebase.json` usa el array multi-database; `firestore.indexes.json` inicial.
6. **Migración sin pérdidas** — `ROOT_COLLECTIONS` incluye `auditLogs`, `routes`, `sms_messages`, y la verificación final **denuncia cualquier colección del origen no contemplada**. `audit_logs` ya **no** se migra: se consolida antes en `auditLogs` (ver abajo) y el script **aborta** si detecta histórico legacy sin consolidar.

### ⚠️ Avisos para el cutover
- **`firebase.json` apunta `(default)` al ruleset TRANSITORIO** (`firestore.default-transitional.rules`), no al de control plane a secas. Ese ruleset combina Control Plane + negocio legacy, de modo que desplegarlo NO bloquea a los usuarios que aún leen de `(default)` — rompe el acoplamiento entre migración y redespliegue de la app. Se sustituye por `firestore.control-plane.rules` SOLO cuando se verifique que toda la operación corre ya contra la base del tenant. `firestore.rules` (ruleset productivo original, con email hardcodeado) queda como referencia/rollback.
- **Cada tenant nuevo debe añadirse a `firebase.json`** para que reciba índices por CLI:
  `{ "database": "tenant-x", "rules": "firestore.tenant.rules", "indexes": "firestore.indexes.json" }`.
  Ojo: la plantilla de reglas necesita sustituir `__TENANT_ID__`, cosa que la CLI no hace — el provisioning las despliega por API (`deployFirestoreRules`). Los **índices** sí requieren la CLI (o la Firestore Admin API): hoy `provisionTenant()` NO crea índices.
- **`audit_logs` vs `auditLogs`**: resuelto en código, **pendiente de ejecutar** contra producción. Ver "Consolidación de auditoría" abajo: es un **prerrequisito del paso 3 del cutover**.
- **Región**: la ubicación por defecto de tenants nuevos es `us-central1` (la de producción). Es **inmutable** una vez creada la base.

## Notas
- Tope Firestore: **100 DBs/proyecto** (default). Escala objetivo <50 ⇒ holgado.
- El array `firestore` de `firebase.json` requiere **firebase-tools ≥ 13**; además `firebase deploy --only firestore:rules|:indexes` es un no-op conocido con esa forma (usar `--only firestore`).
- Confirmar soporte multi-DB del Admin SDK instalado (recomendado actualizar `firebase-admin`).
