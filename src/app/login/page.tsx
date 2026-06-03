
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
import { initializeFirebase, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, type Auth, type User } from "firebase/auth";
import { doc } from "firebase/firestore";
import type { BrandingSettings } from "@/lib/types";
import { logAudit } from "@/lib/audit-log";

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
  
  const firestore = useFirestore();
  const brandingSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, `settings/branding`) : null, [firestore]);
  const { data: brandingSettings, isLoading: brandingLoading } = useDoc<BrandingSettings>(brandingSettingsRef);

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
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      // Log the audit event after successful login
      await logAudit(userCredential.user.uid, 'user:login');

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

  const handleForgotPassword = async () => {
    if (!auth) return;
    const email = form.getValues("email");
    const valid = z.string().email().safeParse(email).success;
    if (!valid) {
      toast({
        variant: "destructive",
        title: "Ingresa tu correo",
        description: "Escribe tu correo electrónico arriba y vuelve a pulsar el enlace.",
      });
      return;
    }
    // Mensaje idéntico en éxito/error para no revelar si la cuenta existe.
    const sameMessage = {
      title: "Revisa tu correo",
      description: "Si la cuenta existe, te enviamos un enlace para restablecer tu contraseña.",
    };
    try {
      await sendPasswordResetEmail(auth, email);
      toast(sameMessage);
    } catch {
      toast(sameMessage);
    }
  };

  const loginImageUrl = brandingSettings?.loginImageUrl || "https://picsum.photos/seed/10/1200/1800";


  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row">
      <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
             <div className="flex justify-center items-center gap-2 mb-4">
                <IconEstratega className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">EstrategaCRM</h1>
             </div>
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
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={!auth}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline disabled:opacity-50"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
      <div className="hidden lg:block lg:w-1/2 relative">
        {brandingLoading ? (
            <div className="h-full w-full bg-muted animate-pulse" />
        ) : (
            <Image
                src={loginImageUrl}
                alt="Imagen de fondo de inicio de sesión"
                fill
                priority
                data-ai-hint="political campaign"
                className="object-cover dark:brightness-[0.2] dark:grayscale"
            />
        )}
      </div>
    </div>
  );
}
