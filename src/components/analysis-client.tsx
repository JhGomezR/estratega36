'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Users, ListChecks, UserCheck, Target } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Campaign, Voter, Call, Task, User } from '@/lib/types'
import { Progress } from './ui/progress'

interface AnalysisClientProps {
  campaigns: Campaign[];
  voters: Voter[];
  calls: Call[];
  tasks: Task[];
  users: User[];
  isLoading: boolean;
}

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const CampaignPerformanceCard = ({ campaign, voters, calls, tasks }: { campaign: Campaign, voters: Voter[], calls: Call[], tasks: Task[] }) => {
    const campaignVoters = voters.filter(v => v.promoterId && campaign.id);
    const campaignCalls = calls.filter(c => c.status === 'atendida');
    const campaignTasks = tasks.filter(t => t.status === 'finalizada');
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{campaign.name}</CardTitle>
                    <a href="#" className="text-sm font-medium text-primary hover:underline">{campaign.progress}% conversión</a>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4"/>
                        <div>
                            <p>Llamadas</p>
                            <p className="font-bold text-foreground">{campaignCalls.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4"/>
                        <div>
                            <p>Votantes</p>
                            <p className="font-bold text-foreground">{campaignVoters.length}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4"/>
                        <div>
                            <p>Tareas</p>
                            <p className="font-bold text-foreground">{campaignTasks.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4"/>
                        <div>
                            <p>Objetivo</p>
                            <p className="font-bold text-foreground">{campaign.goal}</p>
                        </div>
                    </div>
                </div>
                <Progress value={campaign.progress} />
            </CardContent>
        </Card>
    );
}

export function AnalysisClient({ campaigns, voters, calls, tasks, users, isLoading }: AnalysisClientProps) {

  const globalStats = React.useMemo(() => {
    const activeUsers = users.filter(u => u.status === 'activo').length;
    const totalVoters = voters.filter(v => v.status === 'activo').length;
    const attendedCalls = calls.filter(c => c.status === 'atendida').length;
    const completedTasks = tasks.filter(t => t.status === 'finalizada').length;

    return { activeUsers, totalVoters, attendedCalls, completedTasks };
  }, [users, voters, calls, tasks]);

  if (isLoading) {
      return (
          <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
              </div>
              <Card>
                  <CardHeader>
                      <Skeleton className="h-6 w-1/4" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <Skeleton className="h-32" />
                      <Skeleton className="h-32" />
                  </CardContent>
              </Card>
          </div>
      )
  }


  return (
    <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Votantes Totales" value={globalStats.totalVoters} icon={Users} />
            <StatCard title="Llamadas Realizadas" value={globalStats.attendedCalls} icon={Phone} />
            <StatCard title="Tareas Completadas" value={globalStats.completedTasks} icon={ListChecks} />
            <StatCard title="Usuarios Activos" value={globalStats.activeUsers} icon={UserCheck} />
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Campaña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            {campaigns.length > 0 ? campaigns.map(campaign => (
                <CampaignPerformanceCard 
                    key={campaign.id} 
                    campaign={campaign} 
                    voters={voters}
                    calls={calls}
                    tasks={tasks}
                />
            )) : (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">No hay campañas activas para analizar.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
