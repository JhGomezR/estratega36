"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Call, User } from "@/lib/types"
import { CallStatus } from "@/lib/types"
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
import { useUser } from "@/firebase"

const callFormSchema = z.object({
  status: z.enum(CallStatus),
  attempts: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int().min(0, "Los intentos no pueden ser negativos.")
  ),
  userId: z.string().optional(),
});

type CallFormValues = z.infer<typeof callFormSchema>;

interface CallFormProps {
  call: Call;
  users: User[];
  onSubmit: (data: CallFormValues) => void;
  onCancel: () => void;
}

const statusLabels: Record<(typeof CallStatus)[number], string> = {
  pendiente: "Pendiente",
  atendida: "Atendida",
};

export function CallForm({ call, users, onSubmit, onCancel }: CallFormProps) {
  const { user: currentUser } = useUser();
  
  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      status: call.status,
      attempts: call.attempts,
      userId: call.userId ?? currentUser?.uid,
    },
  });

  const handleAttemptsIncrement = () => {
    form.setValue('attempts', form.getValues('attempts') + 1);
  };
  
  const handleFormSubmit = (data: CallFormValues) => {
    onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Estado de la Llamada</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {CallStatus.map(status => (
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
            <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Llamada realizada por</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona un usuario" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
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
            name="attempts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intentos de Llamada</FormLabel>
                <div className="flex items-center gap-2">
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={handleAttemptsIncrement}>
                        +1 Intento
                    </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Form>
  )
}
