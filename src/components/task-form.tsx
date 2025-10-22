"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Task, User } from "@/lib/types"
import { TaskPriority, TaskStatus } from "@/lib/types"
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
import { Textarea } from "./ui/textarea"

const taskFormSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  description: z.string().optional(),
  assignedToId: z.string({ required_error: "Debes asignar la tarea a un usuario." }),
  startDate: z.string().optional(),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "La fecha límite es inválida." }),
  priority: z.enum(TaskPriority),
  status: z.enum(TaskStatus),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task?: Task | null;
  users: User[];
  onSubmit: (data: Omit<TaskFormValues, 'startDate'>) => void;
  onCancel: () => void;
}

const priorityLabels: Record<(typeof TaskPriority)[number], string> = {
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const statusLabels: Record<(typeof TaskStatus)[number], string> = {
  pendiente: "Pendiente",
  en_curso: "En Curso",
  finalizada: "Finalizada",
};

export function TaskForm({ task, users, onSubmit, onCancel }: TaskFormProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assignedToId: task?.assignedToId ?? undefined,
      startDate: task?.startDate ?? "",
      dueDate: task?.dueDate ?? "",
      priority: task?.priority ?? "normal",
      status: task?.status ?? "pendiente",
    },
  });

  function handleFormSubmit(data: TaskFormValues) {
    const { startDate, ...rest } = data;
    onSubmit(rest);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Tarea</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Organizar reunión con líderes comunitarios" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Añade una descripción más detallada de la tarea..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asignado a</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {`${user.firstName} ${user.lastName}`}
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
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Límite</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {task && (
            <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <FormControl>
                    <Input type="date" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TaskPriority.map(priority => (
                      <SelectItem key={priority} value={priority} className="capitalize">
                        {priorityLabels[priority]}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TaskStatus.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Tarea</Button>
        </div>
      </form>
    </Form>
  )
}
