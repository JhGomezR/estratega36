import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { voters } from "@/lib/data"

export default function VotersPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Votantes</h1>
          <p className="text-muted-foreground">Administra la información de los votantes.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Votante
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Votantes</CardTitle>
          <CardDescription>
            Un listado de todos los votantes registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Promotor</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voters.map((voter) => (
                <TableRow key={voter.id}>
                  <TableCell className="font-medium">{voter.name}</TableCell>
                  <TableCell>{voter.email}</TableCell>
                  <TableCell>{voter.city}</TableCell>
                  <TableCell>{voter.promoterName}</TableCell>
                  <TableCell>{voter.registrationDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        voter.status === "active"
                          ? "default"
                          : voter.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {voter.status}
                    </Badge>
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
