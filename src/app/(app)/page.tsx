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
import { Badge } from "@/components/ui/badge"
import {
  Target,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { campaigns, recentActivities, voters, promoters } from "@/lib/data"
import { Progress } from "@/components/ui/progress"
import { VoterRegistrationChart } from "@/components/voter-registration-chart"

export default function Dashboard() {
  const newVotersCount = voters.filter(v => new Date(v.registrationDate) > new Date(new Date().setDate(new Date().getDate() - 30))).length;

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
            <div className="text-2xl font-bold">{voters.length}</div>
            <p className="text-xs text-muted-foreground">
              Total de votantes registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nuevos Votantes (30d)
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newVotersCount}</div>
            <p className="text-xs text-muted-foreground">
              En los últimos 30 días
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotores Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoters.length}</div>
            <p className="text-xs text-muted-foreground">
              Miembros del equipo registrando votantes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              Campañas actualmente en progreso
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Registros de Votantes</CardTitle>
            <CardDescription>Registros mensuales de nuevos votantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <VoterRegistrationChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Progreso de Campañas</CardTitle>
            <CardDescription>Progreso actual de las campañas activas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {campaigns.filter(c => c.status === 'active').map(campaign => (
              <div key={campaign.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{campaign.name}</span>
                  <span className="text-xs text-muted-foreground">{campaign.progress}%</span>
                </div>
                <Progress value={campaign.progress} aria-label={`${campaign.name} progress`} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
       <Card>
          <CardHeader>
            <CardTitle>Actividades Recientes</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.type}</TableCell>
                    <TableCell>{activity.description}</TableCell>
                    <TableCell>{activity.date}</TableCell>
                    <TableCell>
                      <Badge variant={
                        activity.status === 'completed' ? 'default' :
                        activity.status === 'in-progress' || activity.status === 'scheduled' ? 'secondary' :
                        'outline'
                      }>{activity.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  )
}
