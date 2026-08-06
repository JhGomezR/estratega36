
export type WithId<T> = T & { id: string };

export type Voter = WithId<{
  firstName: string;
  lastName: string;
  age: number;
  idType: string;
  idNumber: string;
  email?: string;
  phone?: string;
  countryId: string;
  departmentId: string;
  cityId: string;
  vereda: string;
  address: string;
  promoterId: string;
  /** Campaña a la que pertenece el votante. Vacío/ausente = sin campaña. */
  campaignId?: string;
  registrationDate: string;
  latitude?: number;
  longitude?: number;
  sector?: string;
  status: 'activo' | 'inactivo';
}>;

export type Investor = {
  id: string;
  firstName: string;
  lastName: string;
  description: string;
  investmentAmount: number;
}

export type Campaign = WithId<{
  name: string;
  description: string;
  campaignType: string;
  hasInvestors: boolean;
  investors?: Investor[];
  goal: string;
  startDate: string;
  endDate: string;
  status: 'Futura' | 'En Campaña' | 'Finalizada' | 'Archivada';
  progress: number;
}>;

export type Task = WithId<{
  title: string;
  description?: string;
  assignedToId: string;
  startDate: string;
  dueDate: string;
  status: 'pendiente' | 'en_curso' | 'finalizada' | 'archivada';
  priority: 'normal' | 'alta' | 'urgente';
}>;

export const CallStatus = ['pendiente', 'atendida'] as const;

export type Call = WithId<{
  voterId: string;
  userId?: string;
  status: (typeof CallStatus)[number];
  status_call?: 'activo' | 'inactivo';
  callDate?: string;
  attempts: number;
  details?: string;
}>;

export type User = WithId<{
  firstName: string;
  lastName: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  roleId: string;
  cityIds: string[];
  campaignIds: string[];
  avatar: string;
  status: 'activo' | 'inactivo';
  parentId?: string;
}>;

export type Country = WithId<{
    name: string;
    currency: string;
    language: string;
    status: 'activo' | 'inactivo';
}>;

export type Department = WithId<{
    name: string;
    status: 'activo' | 'inactivo';
    parentCountryId: string;
}>;

export type City = WithId<{
  name: string;
  latitude: number;
  longitude: number;
  status: 'activo' | 'inactivo';
  parentDepartmentId: string;
}>;

export type Role = WithId<{
  name: string;
  permissions: string[];
  status: 'activo' | 'inactivo';
  trash?: boolean;
}>;

export const permissionGroups: Record<string, readonly string[]> = {
  campaign: ["read", "create", "update", "delete"],
  voter: ["read", "create", "update", "delete"],
  user: ["read", "create", "update", "delete"],
  role: ["read", "create", "update", "delete"],
  city: ["read", "create", "update", "delete"],
  task: ["read", "create", "update", "delete"],
  call: ["read", "create", "update", "delete"],
  form: ["read", "create", "update", "delete"],
  report: ["read"],
  setting: ["update"],
  log: ["read"],
};

const generatePermissions = (): readonly string[] => {
  const allPermissions: string[] = [];
  for (const module in permissionGroups) {
    permissionGroups[module].forEach(action => {
      allPermissions.push(`${module}:${action}`);
    });
  }
  return allPermissions as readonly string[];
}

export const availablePermissions = generatePermissions();

export type Permission = (typeof availablePermissions)[number];

export type BrandingSettings = {
  primaryColor?: string;
  accentColor?: string;
  sidebarColor?: string;
  logoUrl?: string;
  loginImageUrl?: string;
};

export type ManagedList = WithId<{
    name: string;
    items: string[];
}>;

export type GeneratedStrategy = WithId<{
    campaignId: string;
    generatedAt: string;
    status: 'active' | 'archived';
    inputs: {
        campaignData: string;
        lugar: string;
        objectives: string;
        resourceConstraints?: string;
    };
    outputs: {
        diagnostico: string;
        marca: string;
        audiencia: string;
        operacion: string;
        consistencia: string;
        microtargeting: string;
        recomendaciones: string;
        riesgos: string;
    };
}>;

export type Keyword = WithId<{
    keyword: string;
    source: 'facebook' | 'twitter' | 'instagram';
    status: 'active' | 'paused';
}>;

export type SocialMention = WithId<{
    keywordId: string;
    source: 'facebook' | 'twitter' | 'instagram';
    content: string;
    author: string;
    url: string;
    timestamp: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'unprocessed';
    latitude?: number;
    longitude?: number;
}>;

export type SocialApiSettings = {
  facebookGraphApiToken?: string;
  facebookAppId?: string;
};

/**
 * Branding for a tenant. Managed exclusively from the Control Plane
 * (no longer editable from inside the tenant app).
 */
export type TenantBranding = {
    primaryColor?: string;
    accentColor?: string;
    sidebarColor?: string;
    logoUrl?: string;
    loginImageUrl?: string;
};

export type TenantStatus = 'provisioning' | 'active' | 'inactive' | 'failed';

/**
 * A tenant lives in the Control Plane (the `(default)` database).
 * Its business data lives in its OWN named Firestore database (`databaseId`).
 */
/**
 * Módulos "de negocio" que un PLAN puede habilitar para un tenant. El gating
 * combina PLAN (qué módulos existen) ∩ RBAC (qué acciones por rol).
 */
export const APP_MODULES = [
  // Cada módulo es INDIVIDUAL (facturable por separado) y tiene su propia
  // regla de acceso vía el gating de plan. `group` es solo para agrupar en la UI.
  { key: 'campaigns',            label: 'Campañas',                 group: 'Operación' },
  { key: 'voters',               label: 'Votantes',                 group: 'Operación' },
  { key: 'voters_map',           label: 'Mapa de Votantes',         group: 'Operación' },
  { key: 'network',              label: 'Mapa de Red',              group: 'Operación' },
  { key: 'activities_calendar',  label: 'Calendario',               group: 'Actividades' },
  { key: 'activities_calls',     label: 'Llamadas',                 group: 'Actividades' },
  { key: 'activities_tasks',     label: 'Tareas',                   group: 'Actividades' },
  { key: 'analysis_campaign',    label: 'Análisis de Campaña (IA)', group: 'Análisis IA' },
  { key: 'analysis_strategies',  label: 'Generador de Estrategias', group: 'Análisis IA' },
  { key: 'analysis_social',      label: 'Escucha Social',           group: 'Análisis IA' },
  { key: 'admin_roles',          label: 'Roles',                    group: 'Administración' },
  { key: 'admin_users',          label: 'Usuarios',                 group: 'Administración' },
  { key: 'admin_cities',         label: 'Ciudades',                 group: 'Administración' },
  { key: 'admin_forms',          label: 'Formularios',              group: 'Administración' },
  { key: 'admin_settings',       label: 'Configuración',            group: 'Administración' },
] as const;

export type AppModuleKey = (typeof APP_MODULES)[number]['key'];

/**
 * Relaciona cada GRUPO de permisos (RBAC, ver `permissionGroups`) con los
 * módulos de PLAN que lo habilitan. Un grupo de permisos solo tiene sentido si
 * el plan del tenant incluye al menos uno de sus módulos; se usa para NO
 * ofrecer permisos de módulos ausentes del plan en el editor de roles (igual
 * que el sidebar oculta esos módulos). `report` cubre las 3 funciones de IA;
 * `user` cubre tanto la gestión de usuarios como el Mapa de Red; `log`
 * (auditoría) se considera parte de la administración/configuración.
 */
export const PERMISSION_GROUP_MODULES: Record<string, AppModuleKey[]> = {
  campaign: ['campaigns'],
  voter: ['voters', 'voters_map'],
  user: ['network', 'admin_users'],
  role: ['admin_roles'],
  city: ['admin_cities'],
  task: ['activities_calendar', 'activities_tasks'],
  call: ['activities_calls'],
  form: ['admin_forms'],
  report: ['analysis_campaign', 'analysis_strategies', 'analysis_social'],
  setting: ['admin_settings'],
  // Mapeado a [] a propósito: `log` (auditoría) es EXCLUSIVO de la administración
  // de plataforma (Control Plane), nunca se ofrece en los roles de un tenant.
  log: [],
};

/** Un plan comercial: define qué módulos habilita. Vive en `(default)/plans`. */
export type Plan = WithId<{
    name: string;
    description?: string;
    modules: string[];
    /** Máximo de usuarios que puede crear el tenant. 0/ausente = ilimitado. */
    maxUsers?: number;
    /** Máximo de roles que puede crear el tenant. 0/ausente = ilimitado. */
    maxRoles?: number;
    /** Máximo de campañas activas (no archivadas). 0/ausente = ilimitado. */
    maxCampaigns?: number;
    status: 'activo' | 'inactivo';
}>;

export type NotificationAudience = 'all' | 'tenant';

/**
 * Notificación del sistema. FUENTE ÚNICA en el Control Plane
 * (`(default)/notifications`): los tenants la leen directamente (solo lectura),
 * por lo que editarla o borrarla desde el admin se refleja en todos sin copias
 * ni propagación. `audience: 'all'` es difusión a todos los tenants;
 * `audience: 'tenant'` va dirigida al `tenantId` indicado.
 */
export type Notification = WithId<{
    title: string;
    body: string;
    /** Imagen incrustada como data URL base64 (opcional). */
    imageUrl?: string;
    audience: NotificationAudience;
    /** Solo cuando audience === 'tenant'. */
    tenantId?: string;
    createdAt: string;
    updatedAt?: string;
    status: 'activo' | 'inactivo';
}>;

export type Tenant = WithId<{
    displayName: string;
    companyName: string;
    /** Id del plan asignado (referencia a `(default)/plans/{plan}`). */
    plan: string;
    /**
     * Módulos habilitados, DENORMALIZADOS desde el plan al aprovisionar/cambiar
     * de plan. Permite el gating sin lecturas ni reglas extra. Ausente =
     * (backward-compat) todos los módulos habilitados.
     */
    planModules?: string[];
    /**
     * Límites denormalizados desde el plan (como planModules) para poder
     * hacerlos cumplir en el servidor sin leer la colección `plans`.
     * 0/ausente = ilimitado.
     */
    maxUsers?: number;
    maxRoles?: number;
    maxCampaigns?: number;
    /** Named Firestore database that holds this tenant's data, e.g. "tenant-acme". */
    databaseId: string;
    ownerUid: string;
    createdAt: string;
    status: TenantStatus;
    branding?: TenantBranding;
    /** @deprecated Tenancy no longer uses subdomains. Kept optional for backward compat during migration. */
    subdomain?: string;
}>;

/**
 * Permissions for the Control Plane (platform operators), independent from tenant permissions.
 */
export const platformPermissionGroups: Record<string, readonly string[]> = {
    tenant: ["read", "create", "update", "delete"],
    platformUser: ["read", "create", "update", "delete"],
    platformRole: ["read", "create", "update", "delete"],
    stats: ["read"],
    /** Auditoría: ver los logs de acciones (plataforma y tenants). Solo plataforma. */
    audit: ["read"],
};

const generatePlatformPermissions = (): readonly string[] => {
    const all: string[] = [];
    for (const module in platformPermissionGroups) {
        platformPermissionGroups[module].forEach(action => all.push(`${module}:${action}`));
    }
    return all as readonly string[];
};

export const availablePlatformPermissions = generatePlatformPermissions();

export type PlatformRole = WithId<{
    name: string;
    permissions: string[];
    status: 'activo' | 'inactivo';
}>;

export type PlatformUser = WithId<{
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
    avatar?: string;
    status: 'activo' | 'inactivo';
}>;

/**
 * Entrada de la colección canónica `auditLogs`.
 *
 * Los campos `userEmail`, `source` y `legacy` solo aparecen en las entradas
 * CONSOLIDADAS desde la colección legacy `audit_logs` (ver
 * `src/lib/audit-log-normalize.ts`): el escritor vivo (`logAudit`) no los
 * produce. Son opcionales para que un mismo consumidor pueda leer el histórico
 * y lo nuevo con el mismo tipo.
 */
export type AuditLog = {
    userId: string;
    /** Tenant al que pertenece la acción; `'platform'` para acciones del admin. */
    tenantId?: string;
    action: string;
    timestamp: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    geo?: {
        city?: string;
        country?: string;
        region?: string;
        latitude?: number;
        longitude?: number;
    };
    /** Email del actor. Solo lo traen las entradas migradas de `audit_logs`. */
    userEmail?: string;
    /** Procedencia. `'legacy:audit_logs'` ⇒ entrada consolidada, no nativa. */
    source?: string;
    /** Campos del esquema legacy sin equivalente canónico (nada se descarta). */
    legacy?: {
        eventType?: string;
        collectionName?: string;
        documentId?: string;
        extra?: Record<string, any>;
    };
};

export const FieldTypes = ["text", "number", "email", "tel", "textarea", "select", "checkbox", "date"] as const;

export type FormField = {
  id: string;
  name: string;
  label: string;
  type: (typeof FieldTypes)[number];
  placeholder?: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  options?: string[];
};

export type Form = WithId<{
  name: string;
  description: string;
  targetEntity: 'voter' | 'user' | 'campaign';
  fields: FormField[];
  status: 'activo' | 'inactivo';
  trash?: boolean;
}>;
