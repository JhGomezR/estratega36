
"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { User, Role, City, Campaign, ManagedList } from "@/lib/types"
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
import { useUser } from "@/firebase"

const userFormSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  idType: z.string({ required_error: "Debe seleccionar un tipo de documento." }),
  idNumber: z.string().min(5, "El número de documento es requerido."),
  email: z.string().email("El correo electrónico no es válido."),
  username: z.string().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
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
  cities: City[];
  campaigns: Campaign[];
  lists: Record<string, ManagedList | undefined>;
  onSubmit: (data: Omit<UserFormValues, 'status'>) => void;
  onCancel: () => void;
}

export function UserForm({ user, roles, cities, campaigns, lists, onSubmit, onCancel }: UserFormProps) {
  const { user: currentUser } = useUser();

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
      parentId: user?.parentId ?? currentUser?.uid,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <Input type="hidden" {...field} />
          )}
        />
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
                <Input type="email" placeholder="ejemplo@correo.com" {...field} />
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
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                    <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
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
                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-4">
                            {cities.map((city) => (
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
                                                        ? field.onChange([...field.value, city.id])
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
                        <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-4">
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
                                                        ? field.onChange([...field.value, campaign.id])
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
