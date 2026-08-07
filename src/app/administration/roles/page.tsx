
"use client"
import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { getImpersonatedTenantId } from "@/firebase/tenant-db"
import { collection, doc } from "firebase/firestore"
import { createRole } from "./actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { usePagedSearch } from "@/hooks/use-paged-search"
import { TableSearch, TablePagination } from "@/components/table-tools"
import { useToast } from "@/hooks/use-toast"
import { logAuditEvent } from "@/lib/audit-log-client"

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
  const auth = useAuth();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const rolesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `roles`) : null, [firestore]);
  const { data: rolesData, isLoading } = useCollection<Role>(rolesCollectionRef);

  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null)

  const roles = React.useMemo(() => {
    return rolesData?.filter(r => !r.trash);
  }, [rolesData]);

  const rolesPaged = usePagedSearch(roles ?? [], (r) => r.name, 10);

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
    if (roleToDelete && rolesCollectionRef && currentUser) {
      setDocumentNonBlocking(doc(rolesCollectionRef, roleToDelete.id), { trash: true, status: 'inactivo' }, { merge: true });
      logAuditEvent(currentUser, 'role:delete', { roleId: roleToDelete.id, name: roleToDelete.name });
      setRoleToDelete(null);
      toast({ title: "Rol Eliminado", description: "El rol ha sido movido a la papelera." });
    }
  }

  const handleFormSubmit = async (data: Omit<Role, 'id'>) => {
    if (!rolesCollectionRef || !currentUser) return;

    if (selectedRole) {
      // Editar sigue en cliente (no aumenta el conteo de roles).
      setDocumentNonBlocking(doc(rolesCollectionRef, selectedRole.id), data, { merge: true });
      logAuditEvent(currentUser, 'role:update', { roleId: selectedRole.id, name: data.name });
      toast({ title: "Rol Actualizado", description: "Los cambios han sido guardados." });
    } else {
      // Crear va por Server Action para hacer cumplir el límite del plan.
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast({ variant: 'destructive', title: 'Error', description: 'Sesión no disponible. Vuelve a iniciar sesión.' });
        return;
      }
      const res = await createRole(
        { name: data.name, permissions: data.permissions, status: data.status },
        idToken,
        getImpersonatedTenantId()
      );
      if (res.error) {
        // Mantén el diálogo abierto para que el usuario ajuste.
        toast({ variant: 'destructive', title: 'No se pudo crear el rol', description: res.error });
        return;
      }
      logAuditEvent(currentUser, 'role:create', { roleId: res.id, name: data.name });
      toast({ title: "Rol Creado", description: "El nuevo rol ha sido creado." });
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
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Roles de Usuario</CardTitle>
            <CardDescription>
              Roles disponibles en el sistema y sus permisos asociados.
            </CardDescription>
          </div>
          <TableSearch value={rolesPaged.query} onChange={rolesPaged.setQuery} placeholder="Buscar rol…" />
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>}
                {!isLoading && rolesPaged.total === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">
                    {rolesPaged.query ? "No se encontraron roles." : "No hay roles para mostrar."}
                  </TableCell></TableRow>
                )}
                {rolesPaged.pageItems.map((role) => (
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
                    <TableCell>
                        <Badge variant={role.status === 'activo' ? 'secondary' : 'outline'}>
                            {role.status === 'activo' ? 'Activo' : 'Inactivo'}
                        </Badge>
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
                            <AlertDialogTitle>¿Estás seguro de eliminar?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción moverá el rol a la papelera. Y no será reversible.
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
        {!isLoading && rolesPaged.total > 0 && (
          <CardFooter className="block">
            <TablePagination paged={rolesPaged} noun="roles" />
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
