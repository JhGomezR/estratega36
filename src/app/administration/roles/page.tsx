
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
import { PlusCircle, Edit, Trash2, Eye, FilePlus, type LucideIcon } from "lucide-react"
import type { Role } from "@/lib/types"
import { permissionGroups } from "@/lib/types"
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { collection, doc } from "firebase/firestore"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const actionIcons: Record<string, LucideIcon> = {
  read: Eye,
  create: FilePlus,
  update: Edit,
  delete: Trash2,
};

const actionLabels: Record<string, string> = {
  read: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
};

export default function RolesPage() {
  const firestore = useFirestore();
  const rolesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `roles`) : null, [firestore]);
  
  const { data: rolesData, isLoading } = useCollection<Role>(rolesCollectionRef);

  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null)

  const roles = React.useMemo(() => {
    return rolesData?.filter(r => !r.trash);
  }, [rolesData]);

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
  }

  const handleDelete = () => {
    if (roleToDelete && rolesCollectionRef) {
      setDocumentNonBlocking(doc(rolesCollectionRef, roleToDelete.id), { trash: true }, { merge: true });
      setRoleToDelete(null)
    }
  }

  const handleFormSubmit = (data: Omit<Role, 'id'>) => {
    if (rolesCollectionRef) {
      if (selectedRole) {
        setDocumentNonBlocking(doc(rolesCollectionRef, selectedRole.id), data, { merge: true });
      } else {
        const newRoleId = data.name.toLowerCase().replace(/\s/g, '_');
        setDocumentNonBlocking(doc(rolesCollectionRef, newRoleId), {...data, trash: false }, {});
      }
    }
    setIsFormOpen(false)
  }
  
  const getGroupedPermissions = (permissions: string[]) => {
      const grouped: Record<string, string[]> = {};
      permissions.forEach(p => {
          const [module, action] = p.split(':');
          if (!grouped[module]) {
              grouped[module] = [];
          }
          grouped[module].push(action);
      });
      return Object.entries(grouped);
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
          <TooltipProvider>
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
                      <div className="flex flex-col gap-2">
                        {getGroupedPermissions(role.permissions).map(([module, actions]) => (
                          <div key={module} className="flex items-center gap-2">
                              <span className="text-sm font-medium capitalize w-24">{module.replace(/_/g, ' ')}:</span>
                              <div className="flex items-center gap-1.5">
                                {actions.map(action => {
                                  const Icon = actionIcons[action];
                                  return (
                                    <Tooltip key={`${module}-${action}`}>
                                      <TooltipTrigger>
                                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="capitalize">{actionLabels[action]}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(role)} disabled={role.id === 'admin'}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog open={!!roleToDelete && roleToDelete.id === role.id} onOpenChange={(open) => !open && setRoleToDelete(null)}>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => confirmDelete(role)} disabled={role.id === 'admin'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción moverá el rol a la papelera. No será visible en la aplicación.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  )
}
