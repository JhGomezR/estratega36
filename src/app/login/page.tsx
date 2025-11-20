
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
import { initializeFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, type Auth } from "firebase/auth";

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
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [auth, setAuth] = React.useState<Auth | null>(null);

  React.useEffect(() => {
    // Initialize Firebase and get the auth instance on the client
    const { auth: firebaseAuth } = initializeFirebase();
    setAuth(firebaseAuth);
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "El servicio de autenticación no está listo. Por favor, espera un momento.",
        });
        return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Bienvenido de nuevo.",
      });
      router.push("/");
    } catch (error: any) {
      console.error(error);
      let description = "Ocurrió un error inesperado.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Las credenciales son incorrectas. Por favor, verifica tu correo y contraseña.";
      }
      toast({
        variant: "destructive",
        title: "Error de Autenticación",
        description,
      });
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
              <Button type="submit" className="w-full" disabled={isSubmitting || !auth}>
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
