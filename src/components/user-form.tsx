"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { User, Role, City, Campaign, ManagedList, Country, Department } from "@/lib/types"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { ScrollArea } from "./ui/scroll-area"
import { usePermissions } from "@/hooks/usePermissions"

const userFormSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  idType: z.string({ required_error: "Debe seleccionar un tipo de documento." }),
  idNumber: z.string().min(5, "El número de documento es requerido."),
  email: z.string().email("El correo electrónico no es válido."),
  username: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  phone: z.string().min(7, "El celular no es válido."),
  roleId: z.string({ required_error: "Debe seleccionar un rol." }),
  cityIds: z.array(z.string()).min(1, "Debe seleccionar al menos una ciudad."),
  campaignIds: z.array(z.string()).min(1, "Debe seleccionar al menos una campaña."),
  parentId: z.string().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User | null;
  roles: Role[];
  campaigns: Campaign[];
  lists: Record<string, ManagedList | undefined>;
  allUsers: User[];
  onSubmit: (data: UserFormValues) => void;
  onCancel: () => void;
}

export function UserForm({ user, roles, campaigns, lists, allUsers, onSubmit, onCancel }: UserFormProps) {
  const { user: authUser } = useAuth();
  const { role: currentUserRole } = usePermissions();
  const isAdmin = currentUserRole?.name.toLowerCase().includes('admin');
  const firestore = useFirestore();

  const { data: countries, isLoading: countriesLoading } = useCollection<Country>(
    useMemoFirebase(() => firestore ? collection(firestore, 'countries') : null, [firestore])
  );

  const [departmentData, setDepartmentData] = React.useState<Record<string, Department[]>>({});
  const [cityData, setCityData] = React.useState<Record<string, City[]>>({});

  const { data: allDepartments } = useCollection<Department>(
    useMemoFirebase(() => firestore ? collection(firestore, 'departments') : null, [firestore])
  );

  const { data: allCities, isLoading: citiesLoading } = useCollection<City>(
      useMemoFirebase(() => firestore ? collection(firestore, 'cities') : null, [firestore])
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      idType: user?.idType,
      idNumber: user?.idNumber ?? "",
      email: user?.email ?? "",
      username: "",
      password: "",
      phone: user?.phone ?? "",
      roleId: user?.roleId ?? undefined,
      cityIds: user?.cityIds ?? [],
      campaignIds: user?.campaignIds ?? [],
      parentId: user?.parentId ?? (isAdmin ? undefined : authUser?.uid)
    },
  });

  const email = form.watch("email");

  React.useEffect(() => {
    if (email) {
      const username = email.split('@')[0];
      form.setValue('username', username);
    } else {
      form.setValue('username', '');
    }
  }, [email, form]);

  const handleFormSubmit = (data: UserFormValues) => {
    const finalData = { ...data };
    if (finalData.parentId === 'none') {
      finalData.parentId = undefined;
    }
    onSubmit(finalData);
  }
  
  const showPasswordChange = isAdmin && user;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {!isAdmin && user && user.id === authUser?.uid && (
            <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
                <Input type="hidden" {...field} />
            )}
            />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Juan" {...field} />
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
                  <Input placeholder="Ej: Pérez" {...field} />
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
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico (para acceso)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ejemplo@correo.com" {...field} disabled={!!user}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Usuario de Acceso</FormLabel>
                    <FormControl>
                    <Input {...field} readOnly disabled />
                    </FormControl>
                    <FormDescription>Se genera automáticamente desde el email.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
            {(!user || showPasswordChange) && (
              <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                      <Input type="password" placeholder={user ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"} {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
             <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {roles.map(role => (
                        <SelectItem key={role.id} value={role.id} className="capitalize">
                            {role.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        {isAdmin && user?.id !== authUser?.uid && (
             <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Registrado por (Parent)</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Asignar un padre jerárquico" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="none">Ninguno (Nivel Superior)</SelectItem>
                        {allUsers.filter(u => u.id !== user?.id).map(u => (
                            <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormDescription>Asigna qué usuario aparecerá como el creador de este. Si se deja en blanco, será un usuario de nivel superior.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="cityIds"
                render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel>Ciudades Asignadas</FormLabel>
                            <FormDescription>Selecciona las ciudades a las que este usuario tendrá acceso.</FormDescription>
                        </div>
                        <ScrollArea className="h-48 rounded-md border p-4">
                          <div className="space-y-2">
                            {allCities?.map((city) => (
                                <FormField
                                    key={city.id}
                                    control={form.control}
                                    name="cityIds"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(city.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), city.id])
                                                        : field.onChange(field.value?.filter((value) => value !== city.id))
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">{city.name}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                           </div>
                        </ScrollArea>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="campaignIds"
                render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel>Campañas Asignadas</FormLabel>
                            <FormDescription>Selecciona las campañas activas para este usuario.</FormDescription>
                        </div>
                        <ScrollArea className="h-48 rounded-md border p-4">
                          <div className="space-y-2">
                            {campaigns.map((campaign) => (
                                <FormField
                                    key={campaign.id}
                                    control={form.control}
                                    name="campaignIds"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(campaign.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), campaign.id])
                                                        : field.onChange(field.value?.filter((value) => value !== campaign.id))
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">{campaign.name}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                          </div>
                        </ScrollArea>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>


        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Usuario</Button>
        </div>
      </form>
    </Form>
  )
}
