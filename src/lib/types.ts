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

export type Campaign = {
  id: string;
  name: string;
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
  role: 'admin' | 'manager' | 'promoter';
  avatar: string;
};

export type City = {
  id: string;
  name: string;
  department: string;
  voterCount: number;
};

export type Role = {
  id: 'admin' | 'manager' | 'promoter';
  name: string;
  permissions: string[];
};
