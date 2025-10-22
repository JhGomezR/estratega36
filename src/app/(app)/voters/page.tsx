"use client"
import * as React from "react"
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
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import type { Voter, City, User } from "@/lib/types"
import { VoterForm } from "@/components/voter-form"
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
import { format, parseISO } from "date-fns"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function VotersPage() {
  const firestore = useFirestore();

  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(
    useMemoFirebase(() => firestore ? collection(firestore, 'cities') : null, [firestore])
  );
  const { data: users, isLoading: usersLoading } = useCollection<User>(
    useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
  );
  
  const promoters = React.useMemo(() => users?.filter(u => u.roleId === 'promoter') || [], [users]);

  const [selectedVoter, setSelectedVoter] = React.useState<Voter | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [voterToDelete, setVoterToDelete] = React.useState<Voter | null>(null)

  const handleAddNew = () => {
    setSelectedVoter(null)
    setIsFormOpen(true)
  }

  const handleEdit = (voter: Voter) => {
    setSelectedVoter(voter)
    setIsFormOpen(true)
  }

  const confirmDelete = (voter: Voter) => {
    setVoterToDelete(voter)
  }

  const handleDelete = () => {
    if (voterToDelete && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'voters', voterToDelete.id))
      setVoterToDelete(null)
    }
  }

  const handleFormSubmit = (data: Omit<Voter, 'id' | 'registrationDate'>) => {
    if (firestore) {
      if (selectedVoter) {
        setDocumentNonBlocking(doc(firestore, 'voters', selectedVoter.id), data, { merge: true });
      } else {
        const newVoter = {
          ...data,
          registrationDate: format(new Date(), "yyyy-MM-dd"),
        };
        addDocumentNonBlocking(collection(firestore, 'voters'), newVoter);
      }
    }
    setIsFormOpen(false);
  };

  const getCityName = (cityId: string) => cities?.find(c => c.id === cityId)?.name ?? 'N/A'
  const getPromoterName = (promoterId: string) => {
      const promoter = promoters.find(p => p.id === promoterId);
      return promoter ? `${promoter.firstName} ${promoter.lastName}` : 'N/A';
  }

  const isLoading = votersLoading || citiesLoading || usersLoading;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Votantes</h1>
          <p className="text-muted-foreground">Administra la información de los votantes.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Votante
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVoter ? "Editar Votante" : "Registrar Votante"}</DialogTitle>
            </DialogHeader>
            <VoterForm
              voter={selectedVoter}
              cities={cities || []}
              promoters={promoters || []}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
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
                <TableHead>Documento</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Vereda/Localidad</TableHead>
                <TableHead>Promotor</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow>}
              {voters?.map((voter) => (
                <TableRow key={voter.id}>
                  <TableCell className="font-medium">{`${voter.firstName} ${voter.lastName}`}</TableCell>
                  <TableCell>{`${voter.idType}: ${voter.idNumber}`}</TableCell>
                  <TableCell>{getCityName(voter.cityId)}</TableCell>
                  <TableCell>{voter.vereda}</TableCell>
                  <TableCell>{getPromoterName(voter.promoterId)}</TableCell>
                  <TableCell>{voter.registrationDate}</TableCell>
                  <TableCell className="text-right">
                     <Button variant="ghost" size="icon" onClick={() => handleEdit(voter)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={!!voterToDelete && voterToDelete.id === voter.id} onOpenChange={(open) => !open && setVoterToDelete(null)}>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => confirmDelete(voter)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al votante.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setVoterToDelete(null)}>Cancelar</AlertDialogCancel>
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
