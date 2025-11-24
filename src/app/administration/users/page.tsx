
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, Eye } from "lucide-react"
import type { User, Role, City, Campaign, ManagedList } from "@/lib/types"
import { UserForm, type UserFormValues } from "@/components/user-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, collectionGroup } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { createUser } from "./actions"
import { usePermissions } from "@/hooks/usePermissions"


export default function UsersPage() {
  const firestore = useFirestore();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { hasPermission, isLoading: permissionsLoading, user: currentUserData, role: currentUserRole } = usePermissions();

  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `users`) : null, [firestore]);
  const rolesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `roles`) : null, [firestore]);
  const campaignsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `campaigns`) : null, [firestore]);
  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `lists`) : null, [firestore]);

  const { data: usersData, isLoading: usersLoading } = useCollection<User>(usersCollectionRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesCollectionRef);
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(useMemoFirebase(() => firestore ? collectionGroup(firestore, 'cities') : null, [firestore]));
  const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsCollectionRef);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null)
  const [citiesToView, setCitiesToView] = React.useState<{ user: User, cities: City[] } | null>(null);
  
  const users = React.useMemo(() => {
    if (!usersData) return [];
    return usersData.filter(u => u.status !== 'inactivo');
  }, [usersData]);


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
    setSelectedUser(null)
    setIsFormOpen(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const confirmDelete = (user: User) => {
    setUserToDelete(user)
  }
  
  const handleViewCities = (user: User) => {
    const assignedCities = cities?.filter(c => user.cityIds.includes(c.id)) || [];
    setCitiesToView({ user, cities: assignedCities });
  }

  const handleDelete = () => {
    if (userToDelete && firestore) {
      setDocumentNonBlocking(doc(firestore, `users`, userToDelete.id), { status: 'inactivo' }, { merge: true });
      setUserToDelete(null)
    }
  }

 const handleFormSubmit = async (data: UserFormValues) => {
    if (!firestore) return;

    try {
      if (selectedUser) {
        // Editing an existing user
        const { password, email, ...firestoreData } = data;
        const finalData: Partial<UserFormValues> = { ...firestoreData };

        if (!password) {
            delete (finalData as any).password;
        }

        if (finalData.parentId === 'none' || !finalData.parentId) {
            delete finalData.parentId;
        }
        setDocumentNonBlocking(doc(firestore, `users`, selectedUser.id), finalData, { merge: true });
        toast({ title: "Usuario Actualizado", description: "Los datos del usuario han sido actualizados." });
      } else {
        // Creating a new user via Server Action
        if (!data.password) {
          toast({ variant: "destructive", title: "Error al crear usuario", description: "La contraseña es obligatoria para nuevos usuarios." });
          return;
        }
        const result = await createUser(data);
        if (result.error) {
          throw new Error(result.error);
        }
        toast({ title: "Usuario Creado", description: `El usuario ${data.firstName} ha sido creado exitosamente.` });
      }
      setIsFormOpen(false);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error handling user form:", error);
        toast({ variant: "destructive", title: "Error al Crear Usuario (Dev)", description: "Revisa la consola para ver el error completo." });
      } else {
        let description = "Ocurrió un error inesperado.";
        if (error.message.includes('auth/email-already-in-use') || error.message.includes('auth/email-already-exists')) {
          description = "El correo electrónico ya está en uso por otra cuenta.";
        } else if (error.message.includes('auth/weak-password')) {
          description = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
        } else if (error.message.includes('permission')) {
            description = "Error de permisos del servidor. Contacta al administrador."
        }
        toast({ variant: "destructive", title: "Error al Crear Usuario", description });
      }
    }
  };


  const getRoleName = (roleId: string) => {
    return roles?.find(r => r.id === roleId)?.name ?? 'N/A'
  }
  
  const isLoading = permissionsLoading || usersLoading || rolesLoading || citiesLoading || campaignsLoading || listsLoading;

  const isAdmin = currentUserRole?.name.toLowerCase().includes('admin');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los usuarios y sus accesos al sistema.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <UserForm
              user={selectedUser}
              roles={roles || []}
              campaigns={campaigns?.filter(c => c.status === 'En Campaña') || []}
              lists={lists}
              allUsers={usersData || []}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Usuarios con acceso a la plataforma EstrategaCRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Ciudades</TableHead>
                <TableHead>Campañas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Cargando...</TableCell></TableRow>}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                      No hay usuarios para mostrar.
                  </TableCell>
                </TableRow>
              )}
              {users?.map((user) => (
                <TableRow key={user.id}>
                   <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                       <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} data-ai-hint="person portrait"/>
                          <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {`${user.firstName} ${user.lastName}`}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{getRoleName(user.roleId)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{user.cityIds.length} de {cities?.length || 0}</span>
                         <Button variant="outline" size="sm" className="h-7" onClick={() => handleViewCities(user)}>
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                        </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.campaignIds.map(id => <Badge variant="outline" key={id}>{campaigns?.find(c=>c.id === id)?.name}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={!!userToDelete && userToDelete.id === user.id} onOpenChange={(open) => !open && setUserToDelete(null)}>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => confirmDelete(user)} disabled={user.email === 'axdrcys@gmail.com'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto marcará al usuario como inactivo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
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
      
        <Dialog open={!!citiesToView} onOpenChange={(open) => !open && setCitiesToView(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ciudades Asignadas a {citiesToView?.user.firstName}</DialogTitle>
                    <DialogDescription>
                        Listado completo de las ciudades a las que este usuario tiene acceso.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto p-1">
                    <ul className="space-y-2">
                        {citiesToView?.cities.map(city => (
                            <li key={city.id} className="text-sm p-2 bg-muted/50 rounded-md">
                                {city.name}
                            </li>
                        ))}
                    </ul>
                     {citiesToView?.cities.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Este usuario no tiene ciudades asignadas.</p>
                     )}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  )
}
