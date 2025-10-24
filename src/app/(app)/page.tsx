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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  UserCheck,
  UserPlus,
  Users,
  CalendarDays,
  CalendarClock
} from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { type Campaign, type Voter, type User, type Task, type Call } from '@/lib/types'
import { subDays, parseISO, isToday, isWithinInterval, startOfToday, endOfToday, startOfWeek, endOfWeek } from 'date-fns'
import { WeeklyVoterChart } from '@/components/weekly-voter-chart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Dashboard() {
  const firestore = useFirestore();

  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  const { data: users, isLoading: usersLoading } = useCollection<User>(
    useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
  );
  
  const promoters = users?.filter(u => u.roleId === 'promoter' || u.roleId === 'lider');

  const { newVotersToday, newVotersThisWeek } = React.useMemo(() => {
    if (!voters) return { newVotersToday: 0, newVotersThisWeek: 0 };
    
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });

    let newVotersToday = 0;
    let newVotersThisWeek = 0;

    voters.forEach(voter => {
      try {
        const registrationDate = parseISO(voter.registrationDate);
        if (isToday(registrationDate)) {
          newVotersToday++;
        }
        if (isWithinInterval(registrationDate, { start: startOfThisWeek, end: endOfThisWeek })) {
          newVotersThisWeek++;
        }
      } catch {
        // Ignore invalid dates
      }
    });
    
    return { newVotersToday, newVotersThisWeek };
  }, [voters]);

  const topLeaders = React.useMemo(() => {
    if (!voters || !users) return [];
    
    const promoterCounts: Record<string, number> = {};
    voters.forEach(voter => {
        promoterCounts[voter.promoterId] = (promoterCounts[voter.promoterId] || 0) + 1;
    });

    const leaders = users.filter(u => u.roleId === 'lider' || u.roleId === 'promotor');

    return leaders
        .map(leader => ({
            ...leader,
            voterCount: promoterCounts[leader.id] || 0,
        }))
        .filter(leader => leader.voterCount > 0)
        .sort((a, b) => b.voterCount - a.voterCount)
        .slice(0, 5);

  }, [voters, users]);


  const isLoading = votersLoading || usersLoading;


  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Votantes Totales
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : voters?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Total de votantes registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Votantes Hoy
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{isLoading ? '...' : newVotersToday}</div>
            <p className="text-xs text-muted-foreground">
              Registrados en el día actual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Votantes (Últimos 7 días)
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{isLoading ? '...' : newVotersThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Registrados esta semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotores Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : promoters?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Miembros del equipo registrando votantes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Votantes Semana a Semana</CardTitle>
            <CardDescription>Visión general de los votantes registrados por semana.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyVoterChart voters={voters} isLoading={isLoading}/>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top 5 Líderes con más Votantes</CardTitle>
            <CardDescription>Conteo de los 5 líderes que han ingresado más votantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Líder</TableHead>
                        <TableHead className="text-right">Votantes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                             <TableRow key={i}>
                                <TableCell className="h-12">Cargando...</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        ))
                    ) : topLeaders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">
                                No hay datos de líderes para mostrar.
                            </TableCell>
                        </TableRow>
                    ) : (
                        topLeaders.map(leader => (
                            <TableRow key={leader.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={leader.avatar} alt={`${leader.firstName} ${leader.lastName}`} data-ai-hint="person portrait"/>
                                            <AvatarFallback>{leader.firstName.charAt(0)}{leader.lastName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">{leader.firstName} {leader.lastName}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-lg">{leader.voterCount}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
