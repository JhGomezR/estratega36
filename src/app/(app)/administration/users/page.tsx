
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
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import type { User, Role, City, Campaign, ManagedList } from "@/lib/types"
import { UserForm, type UserFormValues } from "@/components/user-form"
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
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export default function UsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { user: currentUser, isUserLoading: currentUserLoading } = useUser();

  const { data: usersData, isLoading: usersLoading } = useCollection<User>(
    useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
  );
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(
    useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore])
  );
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(
    useMemoFirebase(() => firestore ? collection(firestore, 'cities') : null, [firestore])
  );
  const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(
    useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore])
  );
  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "lists") : null, [firestore]);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null)

  const users = React.useMemo(() => {
    if (!usersData || !currentUser || !roles) return [];

    const activeUsers = usersData.filter(u => u.status !== 'inactivo');

    // Super admin can see everyone
    if (auth.currentUser?.email === 'axdrcys@gmail.com') {
      return activeUsers;
    }
    
    const currentUserData = usersData.find(u => u.id === currentUser.uid);
    if (!currentUserData) return [];
    
    const currentUserRole = roles.find(r => r.id === currentUserData.roleId)?.name.toLowerCase();

    if (currentUserRole === 'admin') {
        return activeUsers;
    }

    if (currentUserRole === 'lider') {
        const teamMemberIds = usersData.filter(u => u.parentId === currentUser.uid).map(u => u.id);
        const allTeamIds = [currentUser.uid, ...teamMemberIds];
        return activeUsers.filter(u => allTeamIds.includes(u.id));
    }
    
    // Other roles can only see themselves
    return activeUsers.filter(u => u.id === currentUser.uid);

  }, [usersData, currentUser, roles, auth.currentUser]);


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

  const handleDelete = () => {
    if (userToDelete && firestore) {
      setDocumentNonBlocking(doc(firestore, 'users', userToDelete.id), { status: 'inactivo' }, { merge: true });
      setUserToDelete(null)
    }
  }

  const handleFormSubmit = async (data: UserFormValues) => {
    if (!firestore || !auth) return;

    try {
      if (selectedUser) {
        // We don't update auth user here, just firestore document
        const { password, email, ...firestoreData } = data;
        setDocumentNonBlocking(doc(firestore, 'users', selectedUser.id), firestoreData, { merge: true });
        toast({ title: "Usuario Actualizado", description: "Los datos del usuario han sido actualizados." });

      } else {
        if (!data.password) {
            toast({ variant: "destructive", title: "Error al crear usuario", description: "La contraseña es obligatoria para nuevos usuarios." });
            return;
        }
        // Create auth user first
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const newAuthUser = userCredential.user;
        
        const { password, ...restOfData } = data;

        const newUserProfile: Omit<User, 'id'> = {
          ...restOfData,
          avatar: `https://picsum.photos/seed/user${Date.now()}/100/100`,
          status: 'activo',
        };
        
        // Then create firestore document with the same UID
        await setDoc(doc(firestore, 'users', newAuthUser.uid), newUserProfile);
        toast({ title: "Usuario Creado", description: `El usuario ${data.firstName} ha sido creado exitosamente.` });
      }
      setIsFormOpen(false);
    } catch (error: any) {
        console.error("Error handling user form:", error);
        let description = "Ocurrió un error inesperado.";
        if (error.code === 'auth/email-already-in-use') {
            description = "El correo electrónico ya está en uso por otra cuenta.";
        } else if (error.code === 'auth/weak-password') {
            description = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
        }
        toast({ variant: "destructive", title: "Error al crear usuario", description });
    }
  };

  const getRoleName = (roleId: string) => {
    return roles?.find(r => r.id === roleId)?.name ?? 'N/A'
  }
  
  const isLoading = currentUserLoading || usersLoading || rolesLoading || citiesLoading || campaignsLoading || listsLoading;

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
              cities={cities || []}
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
                    <div className="flex flex-wrap gap-1">
                      {user.cityIds.map(id => <Badge variant="outline" key={id}>{cities?.find(c=>c.id === id)?.name}</Badge>)}
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
                         <Button variant="ghost" size="icon" onClick={() => confirmDelete(user)}>
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
    </div>
  )
}

    