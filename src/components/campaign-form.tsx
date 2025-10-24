"use client"
import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Campaign, Investor, ManagedList } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2 } from "lucide-react"
import { isFuture, isPast, parseISO, startOfToday } from "date-fns"

const investorSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido."),
  lastName: z.string().min(1, "El apellido es requerido."),
  description: z.string().optional(),
  investmentAmount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("El monto debe ser positivo.")
  ),
});

const campaignFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  campaignType: z.string({ required_error: "Debe seleccionar un tipo de campaña." }),
  goal: z.string().min(5, "El objetivo debe tener al menos 5 caracteres."),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Fecha de inicio inválida." }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Fecha de fin inválida." }),
  status: z.string({ required_error: "Debe seleccionar un estado." }),
  hasInvestors: z.boolean(),
  investors: z.array(investorSchema).optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
  path: ["endDate"],
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  campaign?: Omit<Campaign, 'id' | 'progress'> | null;
  lists: Record<string, ManagedList | undefined>;
  onSubmit: (data: CampaignFormValues) => void;
  onCancel: () => void;
}

export function CampaignForm({ campaign, lists, onSubmit, onCancel }: CampaignFormProps) {
  const defaultValues = React.useMemo(() => ({
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    campaignType: campaign?.campaignType,
    goal: campaign?.goal ?? "",
    startDate: campaign?.startDate ?? "",
    endDate: campaign?.endDate ?? "",
    status: campaign?.status,
    hasInvestors: campaign?.hasInvestors ?? false,
    investors: campaign?.investors ?? [],
  }), [campaign]);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "investors"
  });

  const hasInvestors = form.watch("hasInvestors");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");


  React.useEffect(() => {
    if (startDate && endDate) {
      try {
        const parsedStartDate = parseISO(startDate);
        const parsedEndDate = parseISO(endDate);
        const today = startOfToday();

        if (isFuture(parsedStartDate)) {
          form.setValue('status', 'Futura', { shouldValidate: true });
        } else if (isPast(parsedEndDate)) {
          form.setValue('status', 'Finalizada', { shouldValidate: true });
        } else if (!isFuture(parsedStartDate) && isFuture(parsedEndDate) || parsedEndDate >= today) {
           form.setValue('status', 'En Campaña', { shouldValidate: true });
        }
      } catch (e) {
        console.error("Invalid date format for status calculation");
      }
    }
  }, [startDate, endDate, form]);


  function handleFormSubmit(data: CampaignFormValues) {
    onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Campaña</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Alcaldía 2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="campaignType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Campaña</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lists.campaignTypes?.items?.map(type => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe brevemente la campaña..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Fecha de Inicio</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Fecha de Fin</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Objetivo Principal</FormLabel>
                <FormControl>
                    <Input placeholder="Ej: Ganar con el 55% de los votos" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {lists.campaignStatuses?.items?.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">
                            {status}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="hasInvestors"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>¿La campaña cuenta con inversionistas?</FormLabel>
                <FormDescription>
                  Activa esta opción si registrarás aportes de inversionistas.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {hasInvestors && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Inversionistas
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ firstName: '', lastName: '', description: '', investmentAmount: 0 })}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md relative space-y-2">
                   <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`investors.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`investors.${index}.lastName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                    control={form.control}
                    name={`investors.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Inversionista principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`investors.${index}.investmentAmount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto de Inversión</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
