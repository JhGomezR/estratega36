"use client"
import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Role, Permission } from "@/lib/types"
import { availablePermissions } from "@/lib/types"
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

export function RoleForm({ role, onSubmit, onCancel }: RoleFormProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? "",
      permissions: role?.permissions ?? [],
    },
  });

  const { control, handleSubmit } = form;

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
        
        <FormField
          control={control}
          name="permissions"
          render={() => (
            <FormItem>
                <div className="mb-4">
                    <FormLabel>Permisos</FormLabel>
                    <FormDescription>
                        Selecciona los permisos que tendrá este rol.
                    </FormDescription>
                </div>
                <div className="grid grid-cols-2 gap-4">
                {availablePermissions.map((permission) => (
                    <FormField
                        key={permission}
                        control={control}
                        name="permissions"
                        render={({ field }) => {
                        return (
                            <FormItem
                            key={permission}
                            className="flex flex-row items-start space-x-3 space-y-0"
                            >
                            <FormControl>
                                <Checkbox
                                checked={field.value?.includes(permission)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...field.value, permission])
                                    : field.onChange(
                                        field.value?.filter(
                                        (value) => value !== permission
                                        )
                                    )
                                }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal capitalize">
                                {permission.replace(/_/g, ' ')}
                            </FormLabel>
                            </FormItem>
                        )
                        }}
                    />
                ))}
                </div>
                <FormMessage />
            </FormItem>
          )}
        />


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
