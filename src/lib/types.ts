export type WithId<T> = T & { id: string };

export type Voter = WithId<{
  firstName: string;
  lastName: string;
  idType: (typeof IdentificationType)[number];
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

export const CampaignType = [
  'localidad', 
  'municipal', 
  'edil', 
  'gobernacion', 
  'alcaldia', 
  'presidencia', 
  'senado', 
  'camara'
] as const;

export const CampaignStatus = ['planned', 'active', 'completed'] as const;

export type Campaign = WithId<{
  name: string;
  description: string;
  campaignType: (typeof CampaignType)[number];
  hasInvestors: boolean;
  investors?: Investor[];
  goal: string;
  startDate: string;
  endDate: string;
  status: (typeof CampaignStatus)[number];
  progress: number;
}>;

export type Task = {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
};

export type Call = {
  id: string;
  voterName: string;
  phoneNumber: string;
  scheduledTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
};

export const IdentificationType = [
  'cedula',
  'dni',
  'pasaporte',
  'cedula_extrangeria',
] as const;

export type User = WithId<{
  firstName: string;
  lastName: string;
  idType: (typeof IdentificationType)[number];
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
