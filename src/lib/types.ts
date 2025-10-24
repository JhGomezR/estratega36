
export type WithId<T> = T & { id: string };

export type Voter = WithId<{
  firstName: string;
  lastName: string;
  idType: string;
  idNumber: string;
  email?: string;
  phone?: string;
  cityId: string;
  vereda: string;
  address: string;
  promoterId: string;
  registrationDate: string;
  latitude?: number;
  longitude?: number;
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
  priority: string;
}>;

export const CallStatus = ['pendiente', 'atendida'] as const;

export type Call = WithId<{
  voterId: string;
  userId?: string;
  status: (typeof CallStatus)[number];
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
}>;

export type City = WithId<{
  name: string;
  department: string;
  country: string;
  latitude: number;
  longitude: number;
  status: 'activo' | 'inactivo';
}>;

export type Role = WithId<{
  name: string;
  permissions: string[];
  status: 'activo' | 'inactivo';
}>;

export const availablePermissions = [
  "campaign:create", "campaign:read", "campaign:update", "campaign:delete",
  "voter:create", "voter:read", "voter:update", "voter:delete",
  "user:create", "user:read", "user:update", "user:delete",
  "role:create", "role:read", "role:update", "role:delete",
  "city:create", "city:read", "city:update", "city:delete",
  "task:create", "task:read", "task:update", "task:delete",
  "call:create", "call:read", "call:update", "call:delete",
  "report:read",
  "setting:update"
] as const;

export type Permission = (typeof availablePermissions)[number];

export type BrandingSettings = {
  primaryColor?: string;
  accentColor?: string;
  sidebarColor?: string;
  logoUrl?: string;
};

export type ManagedList = WithId<{
    name: string;
    items: string[];
}>;

