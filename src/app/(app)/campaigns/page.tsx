import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { campaigns } from "@/lib/data"
import { Progress } from "@/components/ui/progress"

export default function CampaignsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Campañas</h1>
          <p className="text-muted-foreground">Administra y monitorea tus campañas políticas.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Campañas</CardTitle>
          <CardDescription>
            Un listado de todas las campañas en tu sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Votantes</TableHead>
                <TableHead>Fecha de Fin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        campaign.status === "active"
                          ? "default"
                          : campaign.status === "completed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.goal}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={campaign.progress} className="w-24" />
                        <span>{campaign.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{campaign.voterCount}</TableCell>
                  <TableCell>{campaign.endDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
