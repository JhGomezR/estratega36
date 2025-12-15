
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
import { useAuth, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { useDebounce } from 'use-debounce';
import { Loader2 } from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"

const getVoterFormSchema = (allVoters: Voter[], currentVoterId?: string) => z.object({
  firstName: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+(?: [a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+)*$/, "El nombre solo puede contener letras y un espacio entre palabras."),
  lastName: z.string()
    .min(2, "El apellido debe tener al menos 2 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+(?: [a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+)*$/, "El apellido solo puede contener letras y un espacio entre palabras."),
  age: z.preprocess(
    (val) => (val === '' ? NaN : parseInt(String(val), 10)),
    z.number({ required_error: "La edad es requerida.", invalid_type_error: "La edad debe ser un número."})
      .int()
      .min(18, "El votante debe ser mayor de edad (18 años).")
      .max(120, "La edad no es válida.")
  ),
  idType: z.string({ required_error: "Debe seleccionar un tipo de documento." }).min(1, "Debe seleccionar un tipo de documento."),
  idNumber: z.string()
    .min(5, "El número de documento es requerido.")
    .regex(/^[a-zA-Z0-9]+$/, "El número de documento solo puede contener letras y números."),
  email: z.string().email("El correo electrónico no es válido.").optional().or(z.literal('')),
  phone: z.string()
    .regex(/^\d{10}$/, "El celular debe contener exactamente 10 números."),
  countryId: z.string({ required_error: "Debe seleccionar un país." }).min(1, "Debe seleccionar un país."),
  departmentId: z.string({ required_error: "Debe seleccionar un departamento." }).min(1, "Debe seleccionar un departamento."),
  cityId: z.string({ required_error: "Debe seleccionar una ciudad." }).min(1, "Debe seleccionar una ciudad."),
  vereda: z.string().min(2, "La vereda o localidad es requerida."),
  address: z.string().min(5, "La dirección es requerida."),
  sector: z.string({ required_error: "El sector de trabajo es obligatorio." }).min(1, "El sector de trabajo es obligatorio."),
  promoterId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.idNumber) {
      const isDuplicate = allVoters.some(
        (v) => v.idNumber === data.idNumber && v.id !== currentVoterId
      );
      if (isDuplicate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Este número de documento ya está registrado.",
          path: ["idNumber"],
        });
      }
    }
    if (data.phone) {
      const isDuplicate = allVoters.some(
        (v) => v.phone === data.phone && v.id !== currentVoterId
      );
      if (isDuplicate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Este número de celular ya está registrado.",
          path: ["phone"],
        });
      }
    }
});


export type VoterFormValues = z.infer<ReturnType<typeof getVoterFormSchema>>;

interface VoterFormProps {
  voter?: Voter | null;
  promoters: User[];
  allVoters: Voter[];
  lists: Record<string, ManagedList | undefined>;
  onSubmit: (data: VoterFormValues, cityName: string, departmentName: string, countryName: string) => void;
  onCancel: () => void;
}

export function VoterForm({ voter, promoters, allVoters, lists, onSubmit, onCancel }: VoterFormProps) {
  const firestore = useFirestore();
  const { user: currentUser } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);

  const voterFormSchema = getVoterFormSchema(allVoters, voter?.id);

  const form = useForm<VoterFormValues>({
    resolver: zodResolver(voterFormSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: voter?.firstName ?? "",
      lastName: voter?.lastName ?? "",
      age: voter?.age ?? 18,
      idType: voter?.idType ?? "",
      idNumber: voter?.idNumber ?? "",
      email: voter?.email ?? "",
      phone: voter?.phone ?? "",
      countryId: voter?.countryId ?? "",
      departmentId: voter?.departmentId ?? "",
      cityId: voter?.cityId ?? "",
      vereda: voter?.vereda ?? "",
      address: voter?.address ?? "",
      sector: voter?.sector ?? "",
      promoterId: voter?.promoterId ?? currentUser?.uid,
    },
  });
  
  const selectedCountryId = form.watch("countryId");
  const selectedDepartmentId = form.watch("departmentId");
  const idNumberValue = form.watch("idNumber");
  const phoneValue = form.watch("phone");

  const [debouncedIdNumber] = useDebounce(idNumberValue, 500);
  const [debouncedPhone] = useDebounce(phoneValue, 500);

  React.useEffect(() => {
    if (debouncedIdNumber) {
      const isDuplicate = allVoters.some(v => v.idNumber === debouncedIdNumber && v.id !== voter?.id);
      if (isDuplicate) {
        form.setError("idNumber", { type: "manual", message: "Este número de documento ya está registrado." });
      } else {
        form.clearErrors("idNumber");
      }
    }
  }, [debouncedIdNumber, allVoters, voter?.id, form]);

  React.useEffect(() => {
    if (debouncedPhone) {
      const isDuplicate = allVoters.some(v => v.phone === debouncedPhone && v.id !== voter?.id);
      if (isDuplicate) {
        form.setError("phone", { type: "manual", message: "Este número de celular ya está registrado." });
      } else {
        form.clearErrors("phone");
      }
    }
  }, [debouncedPhone, allVoters, voter?.id, form]);


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
            sector: voter.sector || "",
            age: voter.age || 18,
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

  async function handleFormSubmit(data: VoterFormValues) {
    setIsSaving(true);
    const countryName = countries?.find(c => c.id === data.countryId)?.name || '';
    const departmentName = departments?.find(d => d.id === data.departmentId)?.name || '';
    const cityName = cities?.find(c => c.id === data.cityId)?.name || '';
    
    try {
        await onSubmit(data, cityName, departmentName, countryName);
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-1 max-h-[75vh] p-1 pr-4">
          <div className="space-y-6 p-6">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        <FormLabel>Correo Electrónico (Opcional)</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="sector"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sector de Trabajo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un sector" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {lists.sectors?.items?.map(sector => (
                                        <SelectItem key={sector} value={sector}>
                                            {sector}
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
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-6 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Guardando..." : "Guardar Votante"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
