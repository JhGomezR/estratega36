
"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  PlusCircle,
  Trash2,
  Facebook,
  Twitter,
  Instagram,
  Loader2,
  Key,
  Save,
  Monitor,
  AlertTriangle,
  Link as LinkIcon,
  Power,
  PowerOff
} from "lucide-react"
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import type { Keyword, SocialApiSettings } from "@/lib/types"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useFacebook } from "@/hooks/useFacebook"

const socialIcons = {
  facebook: <Facebook className="h-5 w-5 text-blue-600" />,
  twitter: <Twitter className="h-5 w-5 text-sky-500" />,
  instagram: <Instagram className="h-5 w-5 text-pink-500" />,
}

export default function SocialListeningPage() {
  const firestore = useFirestore()
  const { toast } = useToast()

  const keywordsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "keywords") : null, [firestore])
  const { data: keywords, isLoading } = useCollection<Keyword>(keywordsCollectionRef)

  const socialApiSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "socialApi") : null, [firestore]);
  const { data: socialApiSettings, isLoading: settingsLoading } = useDoc<SocialApiSettings>(socialApiSettingsRef);
  
  const { sdkLoaded, login, logout } = useFacebook();


  const [newKeyword, setNewKeyword] = React.useState("")
  const [newSource, setNewSource] = React.useState<"facebook" | "twitter" | "instagram">("facebook")
  const [keywordToDelete, setKeywordToDelete] = React.useState<Keyword | null>(null)
  
  const [apiSettings, setApiSettings] = React.useState({
    facebookGraphApiToken: '',
    facebookAppId: '',
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  
  React.useEffect(() => {
    if (socialApiSettings) {
      setApiSettings({
          facebookGraphApiToken: socialApiSettings.facebookGraphApiToken || '',
          facebookAppId: socialApiSettings.facebookAppId || '',
      });
    }
  }, [socialApiSettings]);


  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return

    const keywordData = {
      keyword: newKeyword,
      source: newSource,
      status: "active" as "active" | "paused",
    }
    
    if(firestore) {
        addDocumentNonBlocking(collection(firestore, "keywords"), keywordData)
        setNewKeyword("")
    }
  }

  const handleDeleteKeyword = () => {
    if (keywordToDelete && firestore) {
      deleteDocumentNonBlocking(doc(firestore, "keywords", keywordToDelete.id))
      setKeywordToDelete(null)
    }
  }
  
  const handleSaveSettings = () => {
    if (!socialApiSettingsRef) return;
    setIsSaving(true);
    try {
      setDocumentNonBlocking(socialApiSettingsRef, { facebookAppId: apiSettings.facebookAppId }, { merge: true });
      toast({
        title: "Configuración Guardada",
        description: "Tu App ID de Facebook ha sido guardado.",
      });
    } catch (error) {
      console.error("Error saving API settings:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración. Inténtalo de nuevo.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFacebookLogin = async () => {
    if (!apiSettings.facebookAppId) {
        toast({ variant: "destructive", title: "Falta el App ID", description: "Por favor, guarda un App ID de Facebook antes de conectar." });
        return;
    }
    setIsConnecting(true);
    try {
        const response = await login(apiSettings.facebookAppId);
        if (response && response.authResponse) {
            setDocumentNonBlocking(socialApiSettingsRef!, { facebookGraphApiToken: response.authResponse.accessToken }, { merge: true });
            toast({ title: "Conexión Exitosa", description: "Facebook se ha conectado correctamente." });
        } else {
             toast({ variant: "destructive", title: "Conexión Fallida", description: "No se pudo obtener una respuesta de Facebook." });
        }
    } catch(error) {
        console.error("Facebook login error:", error);
        toast({ variant: "destructive", title: "Error de Conexión", description: "Ocurrió un error al intentar conectar con Facebook." });
    } finally {
        setIsConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escucha Social en Tiempo Real</h1>
        <p className="text-muted-foreground">
          Monitorea, analiza y visualiza lo que se dice de tu campaña en redes sociales.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Key className="h-6 w-6" />Configuración y Conexión</CardTitle>
                    <CardDescription>Conecta tus redes sociales para empezar a monitorear.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="facebook-app-id" className="flex items-center gap-2"><Facebook className="h-4 w-4" /> App ID de Facebook</Label>
                        <div className="flex gap-2">
                            <Input
                                id="facebook-app-id"
                                placeholder="Pega aquí el ID de tu App de Facebook"
                                value={apiSettings.facebookAppId}
                                onChange={(e) => setApiSettings(prev => ({...prev, facebookAppId: e.target.value}))}
                            />
                            <Button onClick={handleSaveSettings} disabled={isSaving || settingsLoading}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar ID
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="facebook-token" className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Token de API Graph de Facebook</Label>
                        <Input
                        id="facebook-token"
                        type="password"
                        placeholder="Se llenará automáticamente al conectar"
                        value={apiSettings.facebookGraphApiToken}
                        readOnly
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                     <Button 
                        variant="outline" 
                        className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white" 
                        disabled={!sdkLoaded || isConnecting || !apiSettings.facebookAppId}
                        onClick={handleFacebookLogin}
                     >
                        {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4"/>}
                        {isConnecting ? "Conectando..." : "Conectar con Facebook"}
                    </Button>
                </CardFooter>
            </Card>

            {/* Keyword Manager */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-6 w-6" />
                    Gestor de Palabras Clave
                </CardTitle>
                <CardDescription>
                    Añade o elimina las palabras clave y hashtags que deseas monitorear en las redes sociales.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex items-center gap-2 mb-6">
                    <Input
                    placeholder="Ej: #CambioSeguro"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="flex-1"
                    />
                    <Select value={newSource} onValueChange={(value) => setNewSource(value as any)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Red Social" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter" disabled>Twitter (Próximamente)</SelectItem>
                        <SelectItem value="instagram" disabled>Instagram (Próximamente)</SelectItem>
                    </SelectContent>
                    </Select>
                    <Button onClick={handleAddKeyword}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Palabra Clave / Hashtag</TableHead>
                        <TableHead>Red Social</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                        </TableRow>
                    ) : keywords && keywords.length > 0 ? (
                        keywords.map((kw) => (
                        <TableRow key={kw.id}>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 capitalize">
                                    {socialIcons[kw.source]}
                                    {kw.source}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={kw.status === 'active' ? 'secondary' : 'outline'}>
                                    {kw.status === 'active' ? 'Activo' : 'Pausado'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setKeywordToDelete(kw)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            Aún no hay palabras clave. ¡Añade una para empezar a monitorear!
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>

        {/* Settings */}
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">Páginas Conectadas</CardTitle>
                    <CardDescription>Activa o desactiva el monitoreo para cada página de Facebook que administras.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Ejemplo de página conectada */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <Facebook className="h-6 w-6 text-blue-600"/>
                            <div>
                                <p className="font-semibold">Página de Campaña Ejemplo</p>
                                <p className="text-xs text-muted-foreground">ID: 1234567890</p>
                            </div>
                        </div>
                        <Switch defaultChecked={true} />
                    </div>
                     <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <Facebook className="h-6 w-6 text-blue-600"/>
                            <div>
                                <p className="font-semibold">Perfil Público del Candidato</p>
                                <p className="text-xs text-muted-foreground">ID: 0987654321</p>
                            </div>
                        </div>
                        <Switch defaultChecked={false} />
                    </div>
                    <div className="text-center text-sm text-muted-foreground pt-4">
                        Conecta tu cuenta de Facebook para ver tus páginas aquí.
                    </div>
                </CardContent>
            </Card>

             <Card className="border-amber-500/50 bg-amber-50/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-6 w-6" />
                        Próximos Pasos
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-700 space-y-2">
                   <p>¡Esta es la base! La lógica de backend (ej. usando **Firebase Functions**) debe ser implementada para:</p>
                   <ul className="list-disc list-inside space-y-1 pl-2">
                       <li>Llamar a la API de Facebook periódicamente.</li>
                       <li>Procesar las menciones y guardarlas en Firestore.</li>
                       <li>Analizar el sentimiento de cada mención.</li>
                   </ul>
                </CardContent>
            </Card>
        </div>
      </div>

       {keywordToDelete && (
         <AlertDialog open onOpenChange={() => setKeywordToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se eliminará la palabra clave <span className="font-bold">"{keywordToDelete.keyword}"</span>. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteKeyword} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  )
}

