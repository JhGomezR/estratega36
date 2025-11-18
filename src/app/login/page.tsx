
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth, useFirestore, useMemoFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import type { Role, User, Tenant } from "@/lib/types";
import { createTenantAndUser } from "@/app/signup/actions";

const loginFormSchema = z.object({
  email: z.string().email("El correo electrónico no es válido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const IconEstratega = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM11 12H13V18H11V12ZM11 8H13V10H11V8Z" />
    </svg>
)

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "axdrcys@gmail.com",
      password: "KratoS_67*23",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Bienvenido de nuevo.",
      });
      router.push("/");
    } catch (error: any) {
      const isLoginError = error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password';
      
      if (isLoginError && data.email === 'axdrcys@gmail.com') {
        try {
          // This will now use the server action to create the tenant and user.
          await createTenantAndUser({
            companyName: 'Ardila Campaña',
            fullName: 'AXCYS Admin',
            subdomain: 'ardila',
            email: data.email,
            password: data.password,
            plan: '360',
          });

          // After successful creation, try to sign in again.
          await signInWithEmailAndPassword(auth, data.email, data.password);
          
          toast({
            title: "Cuenta de Administrador Creada",
            description: "Se ha creado la cuenta y el inquilino de desarrollo 'ardila'. Has iniciado sesión.",
          });
          router.push("/");

        } catch (creationError: any) {
           console.error("Admin creation/login error:", creationError);
           let description = "No se pudo iniciar sesión ni crear la cuenta de administrador.";
           if (creationError.message?.includes('auth/email-already-exists')) {
               description = "El email ya está registrado. Si olvidaste la contraseña, contacta a soporte.";
           } else if (creationError.code === 'auth/wrong-password') {
                description = "La contraseña es incorrecta. Por favor, inténtalo de nuevo.";
           }
           toast({
            variant: "destructive",
            title: "Error Crítico",
            description: description,
          });
        }
      } else {
        console.error(error);
        let description = "Ocurrió un error inesperado.";
        if (isLoginError) {
          description = "Las credenciales son incorrectas. Por favor, verifica tu correo y contraseña.";
        }
        toast({
          variant: "destructive",
          title: "Error de Autenticación",
          description,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Bienvenido a EstrategaCRM</h1>
            <p className="text-balance text-muted-foreground">
              Ingresa tus credenciales para acceder a la plataforma.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tu@correo.com"
                        {...field}
                      />
                    </FormControl>
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Ingresar
              </Button>
            </form>
          </Form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://picsum.photos/seed/10/1200/1800"
          alt="Image"
          width="1920"
          height="1080"
          data-ai-hint="political campaign"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
