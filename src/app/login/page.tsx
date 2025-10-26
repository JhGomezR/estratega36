
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { Role, User } from "@/lib/types";

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
      // Try to sign in first
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Bienvenido de nuevo.",
      });
      router.push("/");
    } catch (error: any) {
      const isLoginError = error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password';
      
      if (isLoginError && data.email === 'axdrcys@gmail.com') {
        // If the admin user does not exist or credentials fail, try to create it
        try {
          if (!firestore) throw new Error("Firestore not available");
          
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const newAuthUser = userCredential.user;

          // Set admin role
          await setDoc(doc(firestore, 'roles', 'admin'), {
            name: 'Admin',
            permissions: [
              "campaign:create", "campaign:read", "campaign:update", "campaign:delete",
              "voter:create", "voter:read", "voter:update", "voter:delete",
              "user:create", "user:read", "user:update", "user:delete",
              "role:create", "role:read", "role:update", "role:delete",
              "city:create", "city:read", "city:update", "city:delete",
              "task:create", "task:read", "task:update", "task:delete",
              "call:create", "call:read", "call:update", "call:delete",
              "report:read",
              "setting:update"
            ],
            status: 'activo'
          });

          const adminProfile: Omit<User, 'id'> = {
            firstName: 'AXCYS',
            lastName: 'Admin',
            email: newAuthUser.email!,
            roleId: 'admin',
            idType: 'admin',
            idNumber: '00000000',
            phone: '0000000000',
            cityIds: [],
            campaignIds: [],
            avatar: `https://picsum.photos/seed/admin/100/100`,
            status: 'activo',
          };
          
          await setDoc(doc(firestore, 'users', newAuthUser.uid), adminProfile);

          toast({
            title: "Cuenta de Administrador Creada",
            description: "Se ha creado la cuenta de super-gestión y has iniciado sesión.",
          });
          router.push("/");

        } catch (creationError: any) {
           // Handle case where creation also fails (e.g., email already exists with different credential, or weak password)
           console.error("Admin creation/login error:", creationError);
           let description = "No se pudo iniciar sesión ni crear la cuenta de administrador.";
           if (creationError.code === 'auth/email-already-in-use') {
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
        // Handle other general errors or errors for non-admin users
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <IconEstratega className="size-12 text-primary" />
            </div>
          <CardTitle className="text-2xl">Bienvenido a EstrategaCRM</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        </CardContent>
      </Card>
    </div>
  );
}
