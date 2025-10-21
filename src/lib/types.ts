export type Voter = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  promoterId: string;
  promoterName: string;
  registrationDate: string;
  status: 'active' | 'inactive' | 'pending';
};

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

export type Campaign = {
  id: string;
  name: string;
  description: string;
  campaignType: (typeof CampaignType)[number];
  hasInvestors: boolean;
  investors?: Investor[];
  goal: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'planned';
  voterCount: number;
  progress: number;
};

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

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
};

export type City = {
  id: string;
  name: string;
  department: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type Role = {
  id: string;
  name: string;
  permissions: string[];
};

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
