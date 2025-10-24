
"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Role } from "@/lib/types"
import { permissionGroups } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"

const roleFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  permissions: z.array(z.string()).min(1, "Debes seleccionar al menos un permiso."),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSubmit: (data: RoleFormValues) => void;
  onCancel: () => void;
}

const actions: ('read' | 'create' | 'update' | 'delete')[] = ['read', 'create', 'update', 'delete'];
const actionLabels: Record<string, string> = {
    read: "Ver",
    create: "Crear",
    update: "Editar",
    delete: "Eliminar"
};

export function RoleForm({ role, onSubmit, onCancel }: RoleFormProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? "",
      permissions: role?.permissions ?? [],
    },
  });

  const { control, handleSubmit, setValue, watch } = form;
  const currentPermissions = watch('permissions');

  const handlePermissionChange = (permission: string, isChecked: boolean) => {
    const updatedPermissions = isChecked
      ? [...currentPermissions, permission]
      : currentPermissions.filter(p => p !== permission);
    setValue('permissions', updatedPermissions, { shouldValidate: true });
  }

  const handleRowToggle = (module: string, isChecked: boolean) => {
      const modulePermissions = permissionGroups[module].map(action => `${module}:${action}`);
      let updatedPermissions = [...currentPermissions];

      if (isChecked) {
          modulePermissions.forEach(p => {
              if (!updatedPermissions.includes(p)) {
                  updatedPermissions.push(p);
              }
          })
      } else {
          updatedPermissions = updatedPermissions.filter(p => !modulePermissions.includes(p));
      }
       setValue('permissions', updatedPermissions, { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Rol</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Voluntario" {...field} disabled={!!role}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Card>
            <CardHeader>
                <CardTitle>Permisos</CardTitle>
                <FormDescription>
                    Selecciona los permisos que tendrá este rol.
                </FormDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72 w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Módulo</TableHead>
                                {actions.map(action => <TableHead key={action}>{actionLabels[action]}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(permissionGroups).map(([module, moduleActions]) => {
                                const allModuleActionsExist = moduleActions.every(action => currentPermissions.includes(`${module}:${action}`));
                                const someModuleActionsExist = moduleActions.some(action => currentPermissions.includes(`${module}:${action}`));

                                return (
                                    <TableRow key={module}>
                                        <TableCell className="font-medium capitalize flex items-center gap-3">
                                            <Checkbox
                                                checked={allModuleActionsExist}
                                                indeterminate={someModuleActionsExist && !allModuleActionsExist}
                                                onCheckedChange={(checked) => handleRowToggle(module, !!checked)}
                                            />
                                            {module.replace(/_/g, ' ')}
                                        </TableCell>
                                        {actions.map(action => {
                                            const permission = `${module}:${action}`;
                                            const hasPermission = moduleActions.includes(action as any);

                                            return (
                                                <TableCell key={action}>
                                                    {hasPermission ? (
                                                        <Checkbox
                                                            checked={currentPermissions.includes(permission)}
                                                            onCheckedChange={(checked) => handlePermissionChange(permission, !!checked)}
                                                        />
                                                    ) : null}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <FormField
                    control={control}
                    name="permissions"
                    render={() => (
                        <FormItem>
                             <FormMessage className="mt-4" />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  )
}
