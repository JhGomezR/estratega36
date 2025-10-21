"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Voter, City, User } from "@/lib/types"
import { IdentificationType } from "@/lib/types"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const voterFormSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  idType: z.enum(IdentificationType),
  idNumber: z.string().min(5, "El número de documento es requerido."),
  email: z.string().email("El correo electrónico no es válido."),
  phone: z.string().min(7, "El celular no es válido."),
  cityId: z.string({ required_error: "Debe seleccionar una ciudad." }),
  vereda: z.string().min(2, "La vereda o localidad es requerida."),
  address: z.string().min(5, "La dirección es requerida."),
  promoterId: z.string({ required_error: "Debe seleccionar un promotor." }),
});

type VoterFormValues = z.infer<typeof voterFormSchema>;

interface VoterFormProps {
  voter?: Voter | null;
  cities: City[];
  promoters: User[];
  onSubmit: (data: VoterFormValues) => void;
  onCancel: () => void;
}

export function VoterForm({ voter, cities, promoters, onSubmit, onCancel }: VoterFormProps) {
  const form = useForm<VoterFormValues>({
    resolver: zodResolver(voterFormSchema),
    defaultValues: {
      firstName: voter?.firstName ?? "",
      lastName: voter?.lastName ?? "",
      idType: voter?.idType ?? "cedula",
      idNumber: voter?.idNumber ?? "",
      email: voter?.email ?? "",
      phone: voter?.phone ?? "",
      cityId: voter?.cityId ?? undefined,
      vereda: voter?.vereda ?? "",
      address: voter?.address ?? "",
      promoterId: voter?.promoterId ?? undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Ana" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: García" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="idType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Documento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {IdentificationType.map(type => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="idNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Documento</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                    <Input type="email" placeholder="ejemplo@correo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                    <Input placeholder="Ej: 3001234567" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad/Municipio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una ciudad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vereda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vereda / Localidad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Chapinero" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                <Input placeholder="Ej: Calle 50 # 20-30" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
       
        <FormField
            control={form.control}
            name="promoterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promotor Asignado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un promotor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {promoters.map(promoter => (
                      <SelectItem key={promoter.id} value={promoter.id}>
                        {`${promoter.firstName} ${promoter.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Votante</Button>
        </div>
      </form>
    </Form>
  )
}
