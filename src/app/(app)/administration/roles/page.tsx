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
import type { Role } from "@/lib/types"
import { RoleForm } from "@/components/role-form"
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
import { useCollection, useFirestore } from "@/firebase"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { collection, doc } from "firebase/firestore"


export default function RolesPage() {
  const firestore = useFirestore();
  const { data: roles, isLoading } = useCollection<Role>(
    React.useMemo(() => firestore ? collection(firestore, 'roles') : null, [firestore])
  );

  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null)


  const handleAddNew = () => {
    setSelectedRole(null)
    setIsFormOpen(true)
  }

  const handleEdit = (role: Role) => {
    setSelectedRole(role)
    setIsFormOpen(true)
  }

  const confirmDelete = (role: Role) => {
    setRoleToDelete(role)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = () => {
    if (roleToDelete && firestore) {
      deleteDocumentNonBlocking(doc(firestore, 'roles', roleToDelete.id))
      setIsDeleteDialogOpen(false)
      setRoleToDelete(null)
    }
  }

  const handleFormSubmit = (data: Omit<Role, 'id'>) => {
    if (firestore) {
      if (selectedRole) {
        setDocumentNonBlocking(doc(firestore, 'roles', selectedRole.id), data, { merge: true });
      } else {
        const newRoleId = data.name.toLowerCase().replace(/\s/g, '_');
        setDocumentNonBlocking(doc(firestore, 'roles', newRoleId), data, {});
      }
    }
    setIsFormOpen(false)
  }

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground">Define roles y permisos para los usuarios del sistema.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedRole ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
            </DialogHeader>
            <RoleForm
              role={selectedRole}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles de Usuario</CardTitle>
          <CardDescription>
            Roles disponibles en el sistema y sus permisos asociados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Cargando...</TableCell></TableRow>}
              {roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium capitalize">{role.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map(p => <Badge variant="outline" key={p}>{p}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(role)} disabled={role.id === 'admin'}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={isDeleteDialogOpen && roleToDelete?.id === role.id} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => confirmDelete(role)} disabled={role.id === 'admin'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el rol.
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
