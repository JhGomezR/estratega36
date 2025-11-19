"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Country } from "@/lib/types"
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

const countryFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  currency: z.string().min(3, "La moneda debe tener 3 caracteres (ej. COP).").max(3, "La moneda debe tener 3 caracteres (ej. COP)."),
  language: z.string().min(2, "El idioma es requerido."),
  status: z.enum(['activo', 'inactivo']),
});

type CountryFormValues = z.infer<typeof countryFormSchema>;

interface CountryFormProps {
  country?: Omit<Country, 'id'> | null;
  onSubmit: (data: CountryFormValues) => void;
  onCancel: () => void;
}

export function CountryForm({ country, onSubmit, onCancel }: CountryFormProps) {
  const form = useForm<CountryFormValues>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: {
      name: country?.name ?? "",
      currency: country?.currency ?? "",
      language: country?.language ?? "",
      status: country?.status ?? 'activo',
    },
  });

  React.useEffect(() => {
    form.reset({
      name: country?.name ?? "",
      currency: country?.currency ?? "",
      language: country?.language ?? "",
      status: country?.status ?? 'activo',
    });
  }, [country, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del País</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Colombia" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda (Código ISO)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: COP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idioma</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Español" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
