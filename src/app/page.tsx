"use client"

import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Building2,
  CalendarDays,
  PhoneForwarded,
  Users,
} from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { type Voter, type User, type Call } from '@/lib/types'
import { parseISO, isToday } from 'date-fns'
import { WeeklyVoterChart } from '@/components/weekly-voter-chart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { VoterRegistrationChart } from '@/components/voter-registration-chart'
import { MetricCard } from '@/components/dashboard/metric-card'
import { PageHeader } from '@/components/layout/page-breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const firestore = useFirestore();

  const votersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `voters`) : null, [firestore]);
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `users`) : null, [firestore]);
  const callsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `calls`) : null, [firestore]);

  const { data: votersData, isLoading: votersLoading } = useCollection<Voter>(votersCollectionRef);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersCollectionRef);
  const { data: callsData, isLoading: callsLoading } = useCollection<Call>(callsCollectionRef);

  const activeVoters = React.useMemo(() => {
    return votersData?.filter(v => v.status === 'activo');
  }, [votersData]);

  const activeCalls = React.useMemo(() => {
    return callsData?.filter(c => c.status_call === 'activo');
  }, [callsData]);

  const { newVotersToday, cityCount } = React.useMemo(() => {
    if (!activeVoters) return { newVotersToday: 0, cityCount: 0 };

    let newVotersTodayCount = 0;
    const uniqueCityIds = new Set<string>();

    activeVoters.forEach(voter => {
      try {
        const registrationDate = parseISO(voter.registrationDate);
        if (isToday(registrationDate)) {
          newVotersTodayCount++;
        }
        if (voter.cityId) {
            uniqueCityIds.add(voter.cityId);
        }
      } catch {
        // Ignore invalid dates
      }
    });

    return { newVotersToday: newVotersTodayCount, cityCount: uniqueCityIds.size };
  }, [activeVoters]);

  const callStats = React.useMemo(() => {
    if (!activeCalls) return { attended: 0, total: 0 };
    const attended = activeCalls.filter(c => c.status === 'atendida').length;
    return { attended, total: activeCalls.length };
  }, [activeCalls]);

  const topUsers = React.useMemo(() => {
    if (!activeVoters || !users) return [];

    const promoterCounts: Record<string, number> = {};
    activeVoters.forEach(voter => {
        promoterCounts[voter.promoterId] = (promoterCounts[voter.promoterId] || 0) + 1;
    });

    return users
        .map(user => ({
            ...user,
            voterCount: promoterCounts[user.id] || 0,
        }))
        .filter(user => user.voterCount > 0)
        .sort((a, b) => b.voterCount - a.voterCount)
        .slice(0, 5);

  }, [activeVoters, users]);


  const isLoading = votersLoading || usersLoading || callsLoading;

  const totalVoters = activeVoters?.length ?? 0;
  const callProgress =
    callStats.total > 0
      ? Math.round((callStats.attended / callStats.total) * 100)
      : 0;
  const maxVoterCount = topUsers[0]?.voterCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general del desempeño de la campaña."
      />

      {/* Tarjetas de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <MetricCard
          label="Votantes Totales"
          value={totalVoters.toLocaleString('es-CO')}
          description="Total de votantes activos registrados"
          icon={Users}
          tone="brand"
          badge={newVotersToday > 0 ? `+${newVotersToday} hoy` : undefined}
          badgeVariant="success"
          isLoading={isLoading}
        />
        <MetricCard
          label="Votantes Hoy"
          value={`+${newVotersToday}`}
          description="Registrados en el día actual"
          icon={CalendarDays}
          tone="success"
          isLoading={isLoading}
        />
        <MetricCard
          label="Municipios con Votantes"
          value={cityCount.toLocaleString('es-CO')}
          description="Municipios únicos con votantes registrados"
          icon={Building2}
          tone="info"
          isLoading={isLoading}
        />
        <MetricCard
          label="Progreso de Llamadas"
          value={`${callStats.attended} / ${callStats.total}`}
          description="Llamadas atendidas del total de activas"
          icon={PhoneForwarded}
          tone="warning"
          badge={callStats.total > 0 ? `${callProgress}%` : undefined}
          badgeVariant={callProgress >= 50 ? "success" : "warning"}
          isLoading={isLoading}
        />
      </div>

      {/* Gráfica semanal + ranking de usuarios */}
      <div className="grid gap-4 md:gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle>Registros Diarios de Votantes</CardTitle>
            <CardDescription>
              Semana actual vs. semana anterior (solo votantes activos).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyVoterChart voters={activeVoters} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle>Top 5 Usuarios con más Votantes</CardTitle>
            <CardDescription>
              Usuarios que han ingresado más votantes activos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ul className="flex flex-col gap-4">
                {[...Array(5)].map((_, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : topUsers.length === 0 ? (
              <p className="py-10 text-center text-theme-sm text-muted-foreground">
                No hay datos de usuarios para mostrar.
              </p>
            ) : (
              <ol className="flex flex-col gap-5">
                {topUsers.map((user, index) => (
                  <li key={user.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        data-ai-hint="person portrait"
                      />
                      <AvatarFallback className="bg-brand-50 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {user.firstName.charAt(0)}
                        {user.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-theme-sm font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {user.voterCount}
                        </Badge>
                      </div>
                      <div
                        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="presentation"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${
                              maxVoterCount > 0
                                ? Math.max(
                                    6,
                                    (user.voterCount / maxVoterCount) * 100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfica mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Mensuales</CardTitle>
          <CardDescription>
            Nuevos votantes activos registrados cada mes durante el año actual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoterRegistrationChart voters={activeVoters} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
