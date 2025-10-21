"use client"
import * as React from "react"
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
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import { cities as initialCities } from "@/lib/data"
import type { City } from "@/lib/types"
import { CityForm } from "@/components/city-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function CitiesPage() {
  const [cities, setCities] = React.useState<City[]>(initialCities)
  const [selectedCity, setSelectedCity] = React.useState<City | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [cityToDelete, setCityToDelete] = React.useState<City | null>(null)

  const handleAddNew = () => {
    setSelectedCity(null)
    setIsFormOpen(true)
  }

  const handleEdit = (city: City) => {
    setSelectedCity(city)
    setIsFormOpen(true)
  }

  const confirmDelete = (city: City) => {
    setCityToDelete(city)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = () => {
    if (cityToDelete) {
      setCities(cities.filter(c => c.id !== cityToDelete.id))
      setIsDeleteDialogOpen(false)
      setCityToDelete(null)
    }
  }

  const handleFormSubmit = (data: Omit<City, 'id'>) => {
    if (selectedCity) {
      const updatedCity: City = { ...selectedCity, ...data };
      setCities(cities.map(c => c.id === selectedCity.id ? updatedCity : c));
    } else {
      const newCity: City = {
        id: `city-${Date.now()}`,
        ...data
      };
      setCities([...cities, newCity]);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Ciudades</h1>
          <p className="text-muted-foreground">Administra las ciudades y localidades de la campaña.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Ciudad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedCity ? "Editar Ciudad" : "Nueva Ciudad"}</DialogTitle>
            </DialogHeader>
            <CityForm
              city={selectedCity}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Lista de Ciudades</CardTitle>
          <CardDescription>
            Ciudades y municipios donde la campaña tiene presencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad/Municipio</TableHead>
                <TableHead>Vereda</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Latitud</TableHead>
                <TableHead>Longitud</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell>{city.vereda}</TableCell>
                  <TableCell>{city.department}</TableCell>
                  <TableCell>{city.country}</TableCell>
                  <TableCell>{city.latitude.toFixed(4)}</TableCell>
                  <TableCell>{city.longitude.toFixed(4)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(city)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={isDeleteDialogOpen && cityToDelete?.id === city.id} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => confirmDelete(city)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la ciudad.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
