
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

export const permissionGroups: Record<string, readonly string[]> = {
  campaign: ["read", "create", "update", "delete"],
  voter: ["read", "create", "update", "delete"],
  user: ["read", "create", "update", "delete"],
  role: ["read", "create", "update", "delete"],
  city: ["read", "create", "update", "delete"],
  task: ["read", "create", "update", "delete"],
  call: ["read", "create", "update", "delete"],
  report: ["read"],
  setting: ["update"],
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
};

export type ManagedList = WithId<{
    name: string;
    items: string[];
}>;
