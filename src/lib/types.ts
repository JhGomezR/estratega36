
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
  { key: 'campaigns', label: 'Campañas' },
  { key: 'voters', label: 'Votantes y Mapa' },
  { key: 'network', label: 'Mapa de Red' },
  { key: 'activities', label: 'Actividades' },
  { key: 'analysis', label: 'Análisis IA' },
  { key: 'administration', label: 'Administración' },
] as const;

export type AppModuleKey = (typeof APP_MODULES)[number]['key'];

/** Un plan comercial: define qué módulos habilita. Vive en `(default)/plans`. */
export type Plan = WithId<{
    name: string;
    description?: string;
    modules: string[];
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
