"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { useAuth, useDoc, useFirebase, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { Loader2, Save } from "lucide-react"
import { doc } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import type { User } from "@/lib/types"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const profileFormSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  phone: z.string().min(7, "El celular no es válido.").optional().or(z.literal('')),
  idNumber: z.string().min(5, "El número de documento es requerido."),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const passwordFormSchema = z.object({
    currentPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function ProfilePage() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => {
    return firestore && authUser ? doc(firestore, `users`, authUser.uid) : null
  }, [firestore, authUser]);

  const { data: user, isLoading: userLoading } = useDoc<User>(userRef);
  
  const roleRef = useMemoFirebase(() => {
      return firestore && user?.roleId ? doc(firestore, `roles`, user.roleId) : null
  }, [firestore, user]);

  const { data: role, isLoading: roleLoading } = useDoc<any>(roleRef);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      idNumber: '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        idNumber: user.idNumber,
      });
    }
  }, [user, profileForm]);

  const handleProfileSubmit = (data: ProfileFormValues) => {
    if (!userRef) return;
    setIsSaving(true);
    setDocumentNonBlocking(userRef, data, { merge: true });
    toast({ title: "Perfil Actualizado", description: "Tus cambios han sido guardados." });
    setIsSaving(false);
  };
  
  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      toast({ variant: "destructive", title: "Error", description: "No hay una sesión activa." });
      return;
    }
    setIsChangingPassword(true);
    try {
      // Re-authenticate before changing the password (Firebase requires a recent login).
      const credential = EmailAuthProvider.credential(currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, data.newPassword);
      toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
      passwordForm.reset();
    } catch (error: any) {
      let description = "No se pudo cambiar la contraseña. Inténtalo de nuevo.";
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        description = "La contraseña actual es incorrecta.";
      } else if (error?.code === 'auth/weak-password') {
        description = "La nueva contraseña es demasiado débil (mínimo 6 caracteres).";
      } else if (error?.code === 'auth/requires-recent-login') {
        description = "Por seguridad, vuelve a iniciar sesión antes de cambiar tu contraseña.";
      }
      toast({ variant: "destructive", title: "Error", description });
    } finally {
      setIsChangingPassword(false);
    }
  }

  const isLoading = isUserLoading || userLoading || roleLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
         <Avatar className="h-24 w-24 border-4 border-primary/20">
            <AvatarImage src={user?.avatar} alt={user?.firstName} data-ai-hint="person portrait"/>
            <AvatarFallback className="text-3xl">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
            <p className="text-muted-foreground">Administra la información de tu cuenta y tu configuración de seguridad.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Estos son los datos asociados a tu cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                                <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                                <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                         </div>
                         <FormField control={profileForm.control} name="idNumber" render={({ field }) => (
                            <FormItem><FormLabel>Número de Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={profileForm.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Celular</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <Input value={user?.email || ''} readOnly disabled/>
                            <FormDescription>No puedes cambiar tu dirección de correo electrónico.</FormDescription>
                        </FormItem>
                        <FormItem>
                            <FormLabel>Rol</FormLabel>
                            <Input value={role?.name || ''} readOnly disabled className="capitalize"/>
                        </FormItem>
                         <div className="flex justify-end">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>Administra la seguridad de tu cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                        <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                            <FormItem><FormLabel>Contraseña Actual</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                            <FormItem><FormLabel>Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirmar Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="flex justify-end">
                            <Button type="submit" variant="destructive" disabled={isChangingPassword}>
                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Cambiar Contraseña
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </div>

    </div>
  )
}
