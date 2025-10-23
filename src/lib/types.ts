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
  status: string;
  progress: number;
}>;

export type Task = WithId<{
  title: string;
  description?: string;
  assignedToId: string;
  startDate: string;
  dueDate: string;
  status: string;
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
}>;

export type City = WithId<{
  name: string;
  department: string;
  country: string;
  latitude: number;
  longitude: number;
}>;

export type Role = WithId<{
  name: string;
  permissions: string[];
}>;

export const availablePermissions = [
  'manage_users',
  'manage_campaigns',
  'view_all_data',
  'manage_settings',
  'manage_promoters',
  'register_voters',
  'view_own_data',
  'manage_roles',
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
