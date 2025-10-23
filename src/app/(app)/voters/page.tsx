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
import type { Voter, City, User, Role, ManagedList } from "@/lib/types"
import { VoterForm, type VoterFormValues } from "@/components/voter-form"
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
import { format } from "date-fns"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { geocodeAddress } from "@/ai/flows/geocode-address"

export default function VotersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(
    useMemoFirebase(() => firestore ? collection(firestore, 'cities') : null, [firestore])
  );
  const { data: users, isLoading: usersLoading } = useCollection<User>(
    useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
  );
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(
    useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore])
  );
  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "lists") : null, [firestore]);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);
  
  const promoters = React.useMemo(() => {
    if (!users || !roles) return [];
    const requiredRoles = ['promotor', 'lider', 'voluntario'];
    const promoterRoleIds = roles
        .filter(r => requiredRoles.includes(r.name.toLowerCase()))
        .map(r => r.id);
        
    if (promoterRoleIds.length === 0) return [];
    
    return users.filter(u => promoterRoleIds.includes(u.roleId));
  }, [users, roles]);

  const [selectedVoter, setSelectedVoter] = React.useState<Voter | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [voterToDelete, setVoterToDelete] = React.useState<Voter | null>(null)

  const lists = React.useMemo(() => {
    const listsMap: Record<string, ManagedList | undefined> = {};
    if (managedLists) {
        managedLists.forEach(list => {
            listsMap[list.id] = list;
        });
    }
    return listsMap;
  }, [managedLists]);


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

  const handleFormSubmit = async (data: VoterFormValues) => {
    if (!firestore) return;

    try {
        const city = cities?.find(c => c.id === data.cityId);
        const fullAddress = `${data.address}, ${data.vereda}, ${city?.name}, ${city?.department}, ${city?.country}`;
        
        const geocodeResult = await geocodeAddress({ address: fullAddress });

        let voterData: Partial<Voter> = { ...data };

        if (geocodeResult && geocodeResult.latitude && geocodeResult.longitude) {
            voterData.latitude = geocodeResult.latitude;
            voterData.longitude = geocodeResult.longitude;
        } else {
            toast({
                variant: "destructive",
                title: "Error de Geocodificación",
                description: "No se pudo obtener la ubicación para la dirección proporcionada. El votante se guardará sin coordenadas.",
            });
        }
        
        if (selectedVoter) {
            setDocumentNonBlocking(doc(firestore, 'voters', selectedVoter.id), voterData, { merge: true });
        } else {
            const newVoter = {
                ...voterData,
                registrationDate: format(new Date(), "yyyy-MM-dd"),
            };
            addDocumentNonBlocking(collection(firestore, 'voters'), newVoter);
        }

        toast({
            title: selectedVoter ? "Votante Actualizado" : "Votante Registrado",
            description: `El votante ${data.firstName} ${data.lastName} ha sido guardado exitosamente.`,
        });

    } catch (error) {
        console.error("Error saving voter:", error);
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: "No se pudo guardar la información del votante. Por favor, intenta de nuevo.",
        });
    } finally {
        setIsFormOpen(false);
    }
  };


  const getCityName = (cityId: string) => cities?.find(c => c.id === cityId)?.name ?? 'N/A'
  const getPromoterName = (promoterId: string) => {
      const promoter = users?.find(p => p.id === promoterId);
      return promoter ? `${promoter.firstName} ${promoter.lastName}` : 'N/A';
  }

  const isLoading = votersLoading || citiesLoading || usersLoading || rolesLoading || listsLoading;


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
            {promoters.length > 0 ? (
              <VoterForm
                voter={selectedVoter}
                cities={cities || []}
                promoters={promoters}
                lists={lists}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
              />
            ) : (
               <div className="py-10 text-center">
                 <p className="mb-2 text-lg font-semibold">No se encontraron roles requeridos.</p>
                 <p className="text-muted-foreground">
                   Para registrar votantes, por favor crea al menos un rol de "Promotor", "Lider" o "Voluntario" y asigna usuarios a ese rol.
                 </p>
              </div>
            )}
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
              {!isLoading && voters?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <p className="font-medium">No hay votantes registrados.</p>
                    <p className="text-sm text-muted-foreground">Comienza registrando un nuevo votante.</p>
                  </TableCell>
                </TableRow>
              )}
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
