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
import type { User, Role, City, Campaign } from "@/lib/types"
import { UserForm } from "@/components/user-form"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function UsersPage() {
  const firestore = useFirestore();

  const { data: users, isLoading: usersLoading } = useCollection<User>(
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

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null)

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
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = () => {
    if (userToDelete && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'users', userToDelete.id))
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleFormSubmit = (data: Omit<User, 'id' | 'avatar'>) => {
    if (firestore) {
      if (selectedUser) {
        setDocumentNonBlocking(doc(firestore, 'users', selectedUser.id), data, { merge: true });
      } else {
        const newUser: Omit<User, 'id'> = {
          avatar: `https://picsum.photos/seed/user${Date.now()}/100/100`,
          ...data
        };
        addDocumentNonBlocking(collection(firestore, 'users'), newUser);
      }
    }
    setIsFormOpen(false);
  };

  const getRoleName = (roleId: string) => {
    return roles?.find(r => r.id === roleId)?.name ?? 'N/A'
  }
  
  const isLoading = usersLoading || rolesLoading || citiesLoading || campaignsLoading;

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
              campaigns={campaigns?.filter(c => c.status === 'active') || []}
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
                    <AlertDialog open={isDeleteDialogOpen && userToDelete?.id === user.id} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => confirmDelete(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario.
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
