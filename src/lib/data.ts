import type { Voter, Campaign, Task, Call, User, Role, Investor, City } from '@/lib/types';
import { subDays, format } from 'date-fns';
import { cities as colombianCities } from '@/lib/cities-data';

export const roles: Role[] = [
    { id: 'admin', name: 'Administrador', permissions: ['manage_users', 'manage_campaigns', 'view_all_data', 'manage_settings', 'manage_roles'] },
    { id: 'manager', name: 'Gerente de Campaña', permissions: ['manage_campaigns', 'view_all_data', 'manage_promoters'] },
    { id: 'promoter', name: 'Promotor', permissions: ['register_voters', 'view_own_data'] },
];

export const cities: City[] = colombianCities;

export const users: User[] = [
  { id: 'user-1', firstName: 'Admin', lastName: 'User', idType: 'cedula', idNumber: '123456789', email: 'admin@strategacrm.com', phone: '3001234567', roleId: 'admin', cityIds: [cities[0].id], campaignIds: ['cam-1', 'cam-2'], avatar: '/avatars/01.png' },
  { id: 'user-2', firstName: 'Campaign', lastName: 'Manager', idType: 'cedula', idNumber: '987654321', email: 'manager@strategacrm.com', phone: '3009876543', roleId: 'manager', cityIds: [cities[1].id, cities[2].id], campaignIds: ['cam-2'], avatar: '/avatars/02.png' },
  { id: 'user-3', firstName: 'Sofia', lastName: 'Promoter', idType: 'pasaporte', idNumber: 'A1B2C3D4', email: 'sofia@promoter.com', phone: '3101112233', roleId: 'promoter', cityIds: [cities[3].id], campaignIds: ['cam-1'], avatar: '/avatars/03.png' },
  { id: 'user-4', firstName: 'Carlos', lastName: 'Promoter', idType: 'cedula_extrangeria', idNumber: 'E9F8G7H6', email: 'carlos@promoter.com', phone: '3204445566', roleId: 'promoter', cityIds: [cities[4].id, cities[5].id], campaignIds: ['cam-1', 'cam-2'], avatar: '/avatars/04.png' },
];

export const promoters = users.filter(u => u.roleId === 'promoter');

export const voters: Voter[] = Array.from({ length: 50 }, (_, i) => {
  const promoter = promoters[i % promoters.length];
  return {
    id: `voter-${i + 1}`,
    name: `Voter ${i + 1}`,
    email: `voter${i + 1}@example.com`,
    phone: `555-01${i.toString().padStart(2, '0')}`,
    city: ['Bogotá', 'Medellín', 'Cali'][i % 3],
    address: `Street ${i + 1}, Neighborhood`,
    promoterId: promoter.id,
    promoterName: `${promoter.firstName} ${promoter.lastName}`,
    registrationDate: format(subDays(new Date(), i * 3), 'yyyy-MM-dd'),
    status: (['active', 'pending', 'inactive'] as const)[i % 3],
  };
});

const investors: Investor[] = [
    { id: 'inv-1', firstName: 'Juan', lastName: 'Perez', description: 'Inversionista ángel', investmentAmount: 50000 },
    { id: 'inv-2', firstName: 'Maria', lastName: 'Gomez', description: 'Fondo de inversión', investmentAmount: 120000 },
];

export const campaigns: Campaign[] = [
  { 
    id: 'cam-1', 
    name: 'Elecciones 2024',
    description: 'Campaña para la elección presidencial con enfoque en desarrollo económico y social.',
    campaignType: 'presidencia',
    hasInvestors: true,
    investors: investors,
    goal: 'Ganar elección presidencial', 
    startDate: '2024-01-01', 
    endDate: '2024-12-31', 
    status: 'active', 
    voterCount: 35, 
    progress: 65 
  },
  { 
    id: 'cam-2', 
    name: 'Campaña Local',
    description: 'Campaña para la alcaldía municipal, centrada en mejorar la infraestructura y servicios locales.',
    campaignType: 'alcaldia',
    hasInvestors: false,
    goal: 'Aumentar base de votantes', 
    startDate: '2024-03-01', 
    endDate: '2024-09-30', 
    status: 'active', 
    voterCount: 15, 
    progress: 40 
  },
  { 
    id: 'cam-3', 
    name: 'Iniciativa Juvenil',
    description: 'Campaña para el senado enfocada en atraer el voto joven a través de iniciativas de educación y empleo.',
    campaignType: 'senado',
    hasInvestors: true,
    investors: [investors[0]],
    goal: 'Conectar con votantes jóvenes', 
    startDate: '2023-10-01', 
    endDate: '2023-12-15', 
    status: 'completed', 
    voterCount: 500, 
    progress: 100 
  },
];

export const tasks: Task[] = [
    { id: 'task-1', title: 'Organizar evento de campaña', assignedTo: 'Campaign Manager', dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'in-progress', priority: 'high' },
    { id: 'task-2', title: 'Diseñar folletos', assignedTo: 'Sofia Promoter', dueDate: format(subDays(new Date(), -3), 'yyyy-MM-dd'), status: 'pending', priority: 'medium' },
    { id: 'task-3', title: 'Contactar líderes comunitarios', assignedTo: 'Carlos Promoter', dueDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), status: 'completed', priority: 'high' },
    { id: 'task-4', title: 'Actualizar redes sociales', assignedTo: 'Sofia Promoter', dueDate: format(new Date(), 'yyyy-MM-dd'), status: 'in-progress', priority: 'medium' },
];

export const calls: Call[] = [
    { id: 'call-1', voterName: 'Voter 1', phoneNumber: '555-0100', scheduledTime: format(new Date(), 'yyyy-MM-dd HH:mm'), status: 'completed', notes: 'Mostró mucho interés en la propuesta educativa.' },
    { id: 'call-2', voterName: 'Voter 5', phoneNumber: '555-0104', scheduledTime: format(subDays(new Date(), -1), 'yyyy-MM-dd HH:mm'), status: 'scheduled', notes: 'Llamar para confirmar asistencia al evento.' },
    { id: 'call-3', voterName: 'Voter 12', phoneNumber: '555-0111', scheduledTime: format(subDays(new Date(), -2), 'yyyy-MM-dd HH:mm'), status: 'scheduled', notes: '' },
];


export const recentActivities = [...tasks.slice(0, 2), ...calls.slice(0, 2)].map(activity => {
    if ('title' in activity) {
        return {
            id: activity.id,
            description: activity.title,
            type: 'Task',
            date: activity.dueDate,
            status: activity.status
        }
    }
    return {
        id: activity.id,
        description: `Llamada a ${activity.voterName}`,
        type: 'Call',
        date: activity.scheduledTime.split(' ')[0],
        status: activity.status
    }
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const voterRegistrationChartData = [
  { month: 'Enero', registrations: 186 },
  { month: 'Febrero', registrations: 305 },
  { month: 'Marzo', registrations: 237 },
  { month: 'Abril', registrations: 173 },
  { month: 'Mayo', registrations: 209 },
  { month: 'Junio', registrations: 214 },
];
