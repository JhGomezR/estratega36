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
import { calls } from "@/lib/data"

export default function CallsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Llamadas</h1>
          <p className="text-muted-foreground">Coordina las llamadas a los votantes.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Programar Llamada
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Llamadas Programadas</CardTitle>
          <CardDescription>
            Listado de todas las llamadas programadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Votante</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Hora Programada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-medium">{call.voterName}</TableCell>
                  <TableCell>{call.phoneNumber}</TableCell>
                  <TableCell>{call.scheduledTime}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        call.status === "completed"
                          ? "default"
                          : call.status === "scheduled"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{call.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
