"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { City } from "@/lib/types"
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
import { Switch } from "./ui/switch"

const cityFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  latitude: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(-90, "La latitud debe estar entre -90 y 90.").max(90, "La latitud debe estar entre -90 y 90.")
  ),
  longitude: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(-180, "La longitud debe estar entre -180 y 180.").max(180, "La longitud debe estar entre -180 y 180.")
  ),
  status: z.enum(['activo', 'inactivo'])
});

type CityFormValues = z.infer<typeof cityFormSchema>;

interface CityFormProps {
  city?: Omit<City, 'id'> | null;
  onSubmit: (data: CityFormValues) => void;
  onCancel: () => void;
}

export function CityForm({ city, onSubmit, onCancel }: CityFormProps) {
  const form = useForm<CityFormValues>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: city?.name ?? "",
      latitude: city?.latitude ?? 0,
      longitude: city?.longitude ?? 0,
      status: city?.status ?? 'activo',
    },
  });

  React.useEffect(() => {
    if (city) {
        form.reset({
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
            status: city.status ?? 'activo',
        });
    } else {
       form.reset({
        name: "",
        latitude: 0,
        longitude: 0,
        status: 'activo',
      });
    }
  }, [city, form]);


  function handleFormSubmit(data: CityFormValues) {
    onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Ciudad/Municipio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Bogotá" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Latitud</FormLabel>
                <FormControl>
                    <Input type="number" step="any" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Longitud</FormLabel>
                <FormControl>
                    <Input type="number" step="any" {...field} />
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
