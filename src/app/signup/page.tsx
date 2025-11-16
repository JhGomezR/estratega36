
'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, CheckCircle, BarChart, Lightbulb, Radio, Phone, Map } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { createTenantAndUser } from './actions'
import { useRouter } from 'next/navigation'

const formSchema = z
  .object({
    companyName: z.string().min(2, 'El nombre de la empresa es requerido.'),
    fullName: z.string().min(3, 'El nombre completo es requerido.'),
    subdomain: z
      .string()
      .min(3, 'El subdominio debe tener al menos 3 caracteres.')
      .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones.'),
    email: z.string().email('El correo electrónico no es válido.'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string(),
    plan: z.enum(['basico', 'estratega', '360'], {
      required_error: 'Debes seleccionar un plan.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

type SignUpFormValues = z.infer<typeof formSchema>

const planModules = {
  basico: [
    { name: 'Dashboard', available: true },
    { name: 'Campañas', available: true },
    { name: 'Votantes', available: true },
    { name: 'Mapa de Red', available: true },
    { name: 'Actividades', available: true },
    { name: 'Llamadas', available: false },
    { name: 'Mapa de Votantes', available: false },
    { name: 'Análisis IA', available: false },
    { name: 'Generador de Estrategias', available: false },
    { name: 'Escucha Social', available: false },
  ],
  estratega: [
    { name: 'Dashboard', available: true },
    { name: 'Campañas', available: true },
    { name: 'Votantes', available: true },
    { name: 'Mapa de Red', available: true },
    { name: 'Actividades', available: true },
    { name: 'Llamadas', available: true },
    { name: 'Mapa de Votantes', available: true },
    { name: 'Análisis IA', available: false },
    { name: 'Generador de Estrategias', available: false },
    { name: 'Escucha Social', available: false },
  ],
  '360': [
    { name: 'Dashboard', available: true },
    { name: 'Campañas', available: true },
    { name: 'Votantes', available: true },
    { name: 'Mapa de Red', available: true },
    { name: 'Actividades', available: true },
    { name: 'Llamadas', available: true },
    { name: 'Mapa de Votantes', available: true },
    { name: 'Análisis IA', available: true },
    { name: 'Generador de Estrategias', available: true },
    { name: 'Escucha Social', available: true },
  ],
}

const moduleIcons: Record<string, React.ReactNode> = {
    'Llamadas': <Phone className="h-4 w-4" />,
    'Mapa de Votantes': <Map className="h-4 w-4" />,
    'Análisis IA': <BarChart className="h-4 w-4" />,
    'Generador de Estrategias': <Lightbulb className="h-4 w-4" />,
    'Escucha Social': <Radio className="h-4 w-4" />
}

export default function SignUpPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      fullName: '',
      subdomain: '',
      email: '',
      password: '',
      confirmPassword: '',
      plan: 'estratega',
    },
  })

  async function onSubmit(data: SignUpFormValues) {
    setIsSubmitting(true)
    try {
        const result = await createTenantAndUser(data);
        if (result.error) {
            throw new Error(result.error);
        }
        toast({
            title: '¡Cuenta Creada Exitosamente!',
            description: 'Serás redirigido a la página de inicio de sesión.',
        });
        router.push('/login');

    } catch (error: any) {
        console.error("Sign up error:", error);
        toast({
            variant: "destructive",
            title: "Error al crear la cuenta",
            description: error.message || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const selectedPlan = form.watch('plan');

  return (
    <div className="w-full min-h-screen bg-muted/40 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 shadow-2xl">
        <div className="p-8 flex flex-col">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-2xl font-bold">Crea una nueva cuenta</CardTitle>
            <CardDescription>
              O <Link href="/login" className="text-primary hover:underline">inicia sesión en tu cuenta</Link>
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de tu campaña o empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dominio</FormLabel>
                    <div className="flex">
                       <FormControl>
                        <Input placeholder="ej: mi-campana" {...field} className="rounded-r-none"/>
                      </FormControl>
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground">
                        .estratega360.com
                      </span>
                    </div>
                    <FormDescription>Podrás añadir un dominio personalizado más tarde.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@correo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Selecciona tu Plan</FormLabel>
                       <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-4"
                        >
                          {Object.keys(planModules).map(planKey => (
                            <FormItem key={planKey}>
                              <FormControl>
                                <RadioGroupItem value={planKey} className="sr-only" />
                              </FormControl>
                              <FormLabel className={cn(
                                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                field.value === planKey && "border-primary"
                              )}>
                                <span className="font-semibold capitalize text-base">{planKey}</span>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </form>
          </Form>
        </div>
        <div className="hidden md:flex flex-col bg-muted/80 p-8 rounded-r-lg">
           <div className="flex-1 flex flex-col justify-center">
             <h3 className="text-xl font-semibold mb-4 capitalize">Plan {selectedPlan}</h3>
             <p className="text-sm text-muted-foreground mb-6">
                Este plan incluye los siguientes módulos:
             </p>
             <ul className="space-y-3">
                {planModules.basico.map(module => (
                    <li key={module.name} className="flex items-center text-sm gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{module.name}</span>
                    </li>
                ))}
                {planModules[selectedPlan].map(module => (
                    module.available && !planModules.basico.find(m => m.name === module.name)?.available ? (
                         <li key={module.name} className="flex items-center text-sm gap-3 font-medium">
                            {moduleIcons[module.name] || <CheckCircle className="h-5 w-5 text-green-500" />}
                            <span>{module.name}</span>
                         </li>
                    ) : null
                ))}
                {planModules.estratega.map(module => (
                    !planModules[selectedPlan].find(m => m.name === module.name)?.available ? (
                        <li key={module.name} className="flex items-center text-sm gap-3 text-muted-foreground line-through">
                             {moduleIcons[module.name] || <CheckCircle className="h-5 w-5" />}
                             <span>{module.name}</span>
                        </li>
                    ): null
                ))}
             </ul>
           </div>
           <div className="mt-auto">
                <Image 
                    src="https://picsum.photos/seed/signup/800/600"
                    alt="Campaign image"
                    data-ai-hint="political campaign"
                    width={800}
                    height={600}
                    className="rounded-lg object-cover"
                />
           </div>
        </div>
      </Card>
    </div>
  )
}
