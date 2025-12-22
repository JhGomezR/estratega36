
"use client"
import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Form as FormType } from "@/lib/types"
import { FieldTypes } from "@/lib/types"
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
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { GripVertical, PlusCircle, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Switch } from "./ui/switch"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { v4 as uuidv4 } from 'uuid';

const formFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "El nombre técnico es requerido.").regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos."),
  label: z.string().min(3, "La etiqueta es requerida."),
  type: z.enum(FieldTypes),
  placeholder: z.string().optional(),
  required: z.boolean(),
  minLength: z.preprocess(v => v === "" ? undefined : parseInt(String(v), 10), z.number().optional()),
  maxLength: z.preprocess(v => v === "" ? undefined : parseInt(String(v), 10), z.number().optional()),
  minValue: z.preprocess(v => v === "" ? undefined : parseInt(String(v), 10), z.number().optional()),
  maxValue: z.preprocess(v => v === "" ? undefined : parseInt(String(v), 10), z.number().optional()),
  options: z.preprocess(
    (val) => typeof val === "string" ? val.split(',').map(s => s.trim()).filter(Boolean) : val,
    z.array(z.string()).optional()
  ),
});

const formSchema = z.object({
  name: z.string().min(3, "El nombre del formulario es requerido."),
  description: z.string().optional(),
  targetEntity: z.enum(['voter', 'user', 'campaign']),
  fields: z.array(formFieldSchema).min(1, "El formulario debe tener al menos un campo."),
  status: z.enum(['activo', 'inactivo']),
  trash: z.boolean().optional(),
});

type FormFormValues = z.infer<typeof formSchema>;

interface FormFormProps {
  form?: FormType | null;
  onSubmit: (data: Omit<FormFormValues, 'trash'>) => void;
  onCancel: () => void;
}

export function FormForm({ form: existingForm, onSubmit, onCancel }: FormFormProps) {
  const form = useForm<FormFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingForm ? {
        ...existingForm,
        fields: existingForm.fields.map(f => ({ ...f, options: f.options || [] }))
    } : {
      name: "",
      description: "",
      targetEntity: 'voter',
      fields: [{ id: uuidv4(), name: "first_name", label: "Nombres", type: "text", required: true }],
      status: "activo",
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "fields"
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
       <ScrollArea className="flex-grow p-1 pr-6">
        <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Nombre del Formulario</FormLabel>
                    <FormControl><Input placeholder="Ej: Registro Básico de Votante" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="targetEntity"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Entidad Asignada</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una entidad" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="voter">Votante</SelectItem>
                            <SelectItem value="user">Usuario</SelectItem>
                            <SelectItem value="campaign">Campaña</SelectItem>
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
                    <FormControl><Textarea placeholder="Describe para qué se usará este formulario..." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Formulario Activo</FormLabel>
                        <FormDescription>Si está inactivo, no se podrá usar para nuevos registros.</FormDescription>
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

            <Separator />
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Campos del Formulario</h3>
                {fields.map((field, index) => (
                    <Card key={field.id} className="relative group bg-muted/30">
                        <CardHeader className="flex flex-row items-center justify-between p-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                Campo #{index + 1}: {form.watch(`fields.${index}.label`) || 'Nuevo Campo'}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => move(index, index - 1)} disabled={index === 0}>
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1}>
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name={`fields.${index}.label`} render={({ field }) => (
                                    <FormItem><FormLabel>Etiqueta</FormLabel><FormControl><Input placeholder="Nombres" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`fields.${index}.name`} render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Técnico</FormLabel><FormControl><Input placeholder="first_name" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`fields.${index}.type`} render={({ field }) => (
                                    <FormItem><FormLabel>Tipo de Campo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>{FieldTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField control={form.control} name={`fields.${index}.placeholder`} render={({ field }) => (
                                    <FormItem><FormLabel>Placeholder (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`fields.${index}.required`} render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2"><div className="space-y-0.5"><FormLabel>Requerido</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                                )}/>
                            </div>
                             {['text', 'textarea'].includes(form.watch(`fields.${index}.type`)) && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                     <FormField control={form.control} name={`fields.${index}.minLength`} render={({ field }) => (
                                        <FormItem><FormLabel>Largo Mínimo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`fields.${index}.maxLength`} render={({ field }) => (
                                        <FormItem><FormLabel>Largo Máximo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            )}
                             {form.watch(`fields.${index}.type`) === 'number' && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                     <FormField control={form.control} name={`fields.${index}.minValue`} render={({ field }) => (
                                        <FormItem><FormLabel>Valor Mínimo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`fields.${index}.maxValue`} render={({ field }) => (
                                        <FormItem><FormLabel>Valor Máximo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            )}
                            {form.watch(`fields.${index}.type`) === 'select' && (
                                <FormField control={form.control} name={`fields.${index}.options`} render={({ field }) => (
                                    <FormItem className="mt-4"><FormLabel>Opciones (separadas por coma)</FormLabel><FormControl><Input placeholder="Opción 1, Opción 2, Opción 3" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            )}
                        </CardContent>
                    </Card>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ id: uuidv4(), name: "", label: "", type: "text", required: false, options: [] })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Campo
                </Button>
            </div>
        </div>
       </ScrollArea>
       <div className="flex justify-end gap-2 p-6 pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">Guardar Formulario</Button>
        </div>
      </form>
    </Form>
  )
}
