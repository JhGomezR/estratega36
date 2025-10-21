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

const cityFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  department: z.string().min(3, "El departamento debe tener al menos 3 caracteres."),
  country: z.string().min(3, "El país debe tener al menos 3 caracteres."),
  latitude: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(-90).max(90)
  ),
  longitude: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().min(-180).max(180)
  ),
});

type CityFormValues = z.infer<typeof cityFormSchema>;

interface CityFormProps {
  city?: City | null;
  onSubmit: (data: CityFormValues) => void;
  onCancel: () => void;
}

export function CityForm({ city, onSubmit, onCancel }: CityFormProps) {
  const form = useForm<CityFormValues>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: city?.name ?? "",
      department: city?.department ?? "",
      country: city?.country ?? "Colombia",
      latitude: city?.latitude ?? 0,
      longitude: city?.longitude ?? 0,
    },
  });

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
         <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Cundinamarca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
         <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <FormControl>
                  <Input {...field} />
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
