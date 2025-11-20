"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Department } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

const departmentFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  status: z.enum(['activo', 'inactivo']),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  department?: Omit<Department, 'id'> | null;
  onSubmit: (data: DepartmentFormValues) => void;
  onCancel: () => void;
}

export function DepartmentForm({ department, onSubmit, onCancel }: DepartmentFormProps) {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: department?.name ?? "",
      status: department?.status ?? 'activo',
    },
  });

  React.useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        status: department.status ?? 'activo',
      });
    } else {
        form.reset({
            name: "",
            status: 'activo',
        });
    }
  }, [department, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Departamento</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Cundinamarca" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Estado</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === 'activo'}
                  onCheckedChange={(checked) => field.onChange(checked ? 'activo' : 'inactivo')}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  )
}
