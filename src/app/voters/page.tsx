
"use client"
import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { PlusCircle, Edit, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react"
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
import { format, parseISO } from "date-fns"
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, collectionGroup } from "firebase/firestore"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { geocodeAddress } from "@/ai/flows/geocode-address"
import { Input } from "@/components/ui/input"

const VOTERS_PER_PAGE = 15;

export default function VotersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const auth = useAuth();
  const { user: currentUser, isUserLoading: currentUserLoading } = useUser();

  const votersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `voters`) : null, [firestore]);
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `users`) : null, [firestore]);
  const rolesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `roles`) : null, [firestore]);
  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `lists`) : null, [firestore]);
  const citiesCollectionGroup = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'cities') : null, [firestore]);

  const { data: votersData, isLoading: votersLoading } = useCollection<Voter>(votersCollectionRef);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersCollectionRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesCollectionRef);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);
  const { data: allCities, isLoading: citiesLoading } = useCollection<City>(citiesCollectionGroup);

  const [selectedVoter, setSelectedVoter] = React.useState<Voter | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [voterToDelete, setVoterToDelete] = React.useState<Voter | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const promoters = React.useMemo(() => {
    if (!users) return [];
    // Allow all active users to be selected as a promoter
    return users.filter(u => u.status === 'activo');
  }, [users]);

  const voters = React.useMemo(() => {
    if (!votersData || !currentUser || !users || !roles) return [];

    const activeVoters = votersData.filter(v => v.status !== 'inactivo');
    
    if (auth.currentUser?.email === 'axdrcys@gmail.com') {
      return activeVoters;
    }

    const currentUserData = users.find(u => u.id === currentUser.uid);
    if (!currentUserData) return [];

    const currentUserRole = roles.find(r => r.id === currentUserData.roleId)?.name.toLowerCase();
    const adminRoles = ['admin', 'super_admin', 'super', 'administrador'];

    if (currentUserRole && adminRoles.includes(currentUserRole)) {
      return activeVoters;
    }

    if (currentUserRole === 'lider') {
      const leaderId = currentUser.uid;
      const teamMemberIds = users.filter(u => u.parentId === leaderId).map(u => u.id);
      const allTeamIds = [leaderId, ...teamMemberIds];
      return activeVoters.filter(voter => allTeamIds.includes(voter.promoterId));
    }

    if (currentUserRole === 'promotor' || currentUserRole === 'voluntario') {
      return activeVoters.filter(voter => voter.promoterId === currentUser.uid);
    }

    return [];

  }, [votersData, currentUser, users, roles, auth.currentUser]);
  

  const lists = React.useMemo(() => {
    const listsMap: Record<string, ManagedList | undefined> = {};
    if (managedLists) {
        managedLists.forEach(list => {
            listsMap[list.id] = list;
        });
    }
    return listsMap;
  }, [managedLists]);
  
  const cityNames = React.useMemo(() => {
    if (!allCities) return {};
    return allCities.reduce((acc, city) => {
        acc[city.id] = city.name;
        return acc;
    }, {} as Record<string, string>);
  }, [allCities]);

  
  const getCityName = (cityId: string) => cityNames[cityId] || 'N/A';
  
  const getPromoterName = (promoterId: string) => {
      const promoter = users?.find(p => p.id === promoterId);
      return promoter ? `${promoter.firstName} ${promoter.lastName}` : 'N/A';
  }

  const filteredVoters = React.useMemo(() => {
    if (!voters) return [];
    if (!searchQuery) return voters;
    const lowercasedQuery = searchQuery.toLowerCase();
    return voters.filter(voter => 
      `${voter.firstName} ${voter.lastName}`.toLowerCase().includes(lowercasedQuery) ||
      voter.idNumber.toLowerCase().includes(lowercasedQuery) ||
      getCityName(voter.cityId).toLowerCase().includes(lowercasedQuery) ||
      getPromoterName(voter.promoterId).toLowerCase().includes(lowercasedQuery)
    );
  }, [voters, searchQuery, cityNames, users]);
  
  const paginatedVoters = React.useMemo(() => {
    const startIndex = (currentPage - 1) * VOTERS_PER_PAGE;
    return filteredVoters.slice(startIndex, startIndex + VOTERS_PER_PAGE);
  }, [filteredVoters, currentPage]);

  const totalPages = Math.ceil(filteredVoters.length / VOTERS_PER_PAGE);

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
    if (voterToDelete && votersCollectionRef) {
      setDocumentNonBlocking(doc(votersCollectionRef, voterToDelete.id), { status: 'inactivo' }, { merge: true });
      setVoterToDelete(null)
      toast({
          title: "Votante Archivado",
          description: "El votante ha sido marcado como inactivo.",
      });
    }
  }

  const handleFormSubmit = async (data: VoterFormValues, cityName: string, departmentName: string, countryName: string) => {
    if (!firestore || !votersCollectionRef) return;

    try {
        const fullAddress = [data.address, data.vereda, cityName, departmentName, countryName].filter(Boolean).join(', ');

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
            setDocumentNonBlocking(doc(votersCollectionRef, selectedVoter.id), voterData, { merge: true });
        } else {
            const newVoter = {
                ...voterData,
                status: 'activo' as const,
                registrationDate: new Date().toISOString(),
            };
            addDocumentNonBlocking(votersCollectionRef, newVoter);
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

  const isLoading = currentUserLoading || votersLoading || usersLoading || rolesLoading || listsLoading || citiesLoading;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVoter ? "Editar Votante" : "Registrar Votante"}</DialogTitle>
            </DialogHeader>
            <VoterForm
              voter={selectedVoter}
              promoters={promoters}
              allVoters={votersData || []}
              lists={lists}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
                <CardTitle>Lista de Votantes</CardTitle>
                <CardDescription>
                    Un listado de todos los votantes registrados en el sistema.
                </CardDescription>
            </div>
            <div className="relative w-full md:w-auto md:min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar votante..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Nombre</TableHead>
                  <TableHead className="min-w-[150px]">Documento</TableHead>
                  <TableHead className="min-w-[120px]">Ciudad</TableHead>
                  <TableHead className="min-w-[120px]">Vereda/Localidad</TableHead>
                  <TableHead className="min-w-[150px]">Promotor</TableHead>
                  <TableHead className="min-w-[120px]">Fecha Registro</TableHead>
                  <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">Cargando...</TableCell></TableRow>}
                {!isLoading && paginatedVoters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <p className="font-medium">No hay votantes para mostrar.</p>
                      <p className="text-sm text-muted-foreground">
                          {searchQuery ? "Intenta con otra búsqueda." : "Comienza registrando un nuevo votante."}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {paginatedVoters.map((voter) => (
                  <TableRow key={voter.id}>
                    <TableCell className="font-medium">{`${voter.firstName} ${voter.lastName}`}</TableCell>
                    <TableCell>{`${voter.idType}: ${voter.idNumber}`}</TableCell>
                    <TableCell>{getCityName(voter.cityId)}</TableCell>
                    <TableCell>{voter.vereda}</TableCell>
                    <TableCell>{getPromoterName(voter.promoterId)}</TableCell>
                    <TableCell>{format(parseISO(voter.registrationDate), 'yyyy-MM-dd')}</TableCell>
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
                               Esta acción no se puede deshacer. Esto marcará al votante como inactivo y no se mostrará en las listas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setVoterToDelete(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Archivar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages > 0 ? totalPages : 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
