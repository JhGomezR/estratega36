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
import { cities } from "@/lib/data"

export default function CitiesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Ciudades</h1>
        <p className="text-muted-foreground">Administra las ciudades y localidades de la campaña.</p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Lista de Ciudades</CardTitle>
          <CardDescription>
            Ciudades donde la campaña tiene presencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Votantes Registrados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell>{city.department}</TableCell>
                  <TableCell>{city.voterCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
