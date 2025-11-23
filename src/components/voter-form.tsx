
"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Voter, City, User, ManagedList, Country, Department } from "@/lib/types"
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"

const voterFormSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  idType: z.string({ required_error: "Debe seleccionar un tipo de documento." }),
  idNumber: z.string().min(5, "El número de documento es requerido."),
  email: z.string().email("El correo electrónico no es válido.").optional().or(z.literal('')),
  phone: z.string().min(7, "El celular no es válido.").optional().or(z.literal('')),
  countryId: z.string({ required_error: "Debe seleccionar un país." }),
  departmentId: z.string({ required_error: "Debe seleccionar un departamento." }),
  cityId: z.string({ required_error: "Debe seleccionar una ciudad." }),
  vereda: z.string().min(2, "La vereda o localidad es requerida."),
  address: z.string().min(5, "La dirección es requerida."),
  promoterId: z.string({ required_error: "Debe seleccionar un promotor." }),
});

export type VoterFormValues = z.infer<typeof voterFormSchema>;

interface VoterFormProps {
  voter?: Voter | null;
  promoters: User[];
  lists: Record<string, ManagedList | undefined>;
  onSubmit: (data: VoterFormValues, cityName: string, departmentName: string, countryName: string) => void;
  onCancel: () => void;
}

export function VoterForm({ voter, promoters, lists, onSubmit, onCancel }: VoterFormProps) {
  const firestore = useFirestore();

  const form = useForm<VoterFormValues>({
    resolver: zodResolver(voterFormSchema),
    defaultValues: {
      firstName: voter?.firstName ?? "",
      lastName: voter?.lastName ?? "",
      idType: voter?.idType,
      idNumber: voter?.idNumber ?? "",
      email: voter?.email ?? "",
      phone: voter?.phone ?? "",
      countryId: voter?.countryId ?? "",
      departmentId: voter?.departmentId ?? "",
      cityId: voter?.cityId ?? "",
      vereda: voter?.vereda ?? "",
      address: voter?.address ?? "",
      promoterId: voter?.promoterId ?? undefined,
    },
  });
  
  const selectedCountryId = form.watch("countryId");
  const selectedDepartmentId = form.watch("departmentId");

  const countriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'countries') : null, [firestore]);
  const { data: countries, isLoading: countriesLoading } = useCollection<Country>(countriesRef);

  const departmentsRef = useMemoFirebase(() => (firestore && selectedCountryId) ? collection(firestore, `countries/${selectedCountryId}/departments`) : null, [firestore, selectedCountryId]);
  const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsRef);

  const citiesRef = useMemoFirebase(() => (firestore && selectedCountryId && selectedDepartmentId) ? collection(firestore, `countries/${selectedCountryId}/departments/${selectedDepartmentId}/cities`) : null, [firestore, selectedCountryId, selectedDepartmentId]);
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(citiesRef);

  React.useEffect(() => {
    if (voter) {
        form.reset({
            ...voter,
            countryId: voter.countryId || "",
            departmentId: voter.departmentId || "",
            cityId: voter.cityId || "",
        });
    }
  }, [voter, form]);

  React.useEffect(() => {
    if (form.getValues('countryId') !== selectedCountryId) {
        form.setValue('departmentId', '');
        form.setValue('cityId', '');
    }
  }, [selectedCountryId, form]);

   React.useEffect(() => {
    if (form.getValues('departmentId') !== selectedDepartmentId) {
        form.setValue('cityId', '');
    }
  }, [selectedDepartmentId, form]);

  function handleFormSubmit(data: VoterFormValues) {
    const countryName = countries?.find(c => c.id === data.countryId)?.name || '';
    const departmentName = departments?.find(d => d.id === data.departmentId)?.name || '';
    const cityName = cities?.find(c => c.id === data.cityId)?.name || '';
    onSubmit(data, cityName, departmentName, countryName);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                    {lists.identificationTypes?.items?.map(type => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type.replace(/_/g, ' ')}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={countriesLoading ? "Cargando..." : "Selecciona país"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries?.map(country => <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCountryId || departmentsLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={departmentsLoading ? "Cargando..." : "Selecciona dpto."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments?.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad/Municipio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartmentId || citiesLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={citiesLoading ? "Cargando..." : "Selecciona ciudad"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities?.map(city => (
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
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
       
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

    