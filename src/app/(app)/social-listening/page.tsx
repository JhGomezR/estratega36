
"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  BarChart2,
  AlertTriangle
} from "lucide-react"
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import type { Keyword, SocialApiSettings } from "@/lib/types"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

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

  const [newKeyword, setNewKeyword] = React.useState("")
  const [newSource, setNewSource] = React.useState<"facebook" | "twitter" | "instagram">("facebook")
  const [keywordToDelete, setKeywordToDelete] = React.useState<Keyword | null>(null)
  
  const [apiToken, setApiToken] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  
  React.useEffect(() => {
    if (socialApiSettings?.facebookGraphApiToken) {
      setApiToken(socialApiSettings.facebookGraphApiToken);
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
      setDocumentNonBlocking(socialApiSettingsRef, { facebookGraphApiToken: apiToken }, { merge: true });
      toast({
        title: "Configuración Guardada",
        description: "El token de la API de Facebook ha sido guardado.",
      });
    } catch (error) {
      console.error("Error saving API settings:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo guardar el token. Inténtalo de nuevo.",
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escucha Social en Tiempo Real</h1>
        <p className="text-muted-foreground">
          Monitorea, analiza y visualiza lo que se dice de tu campaña en redes sociales.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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

            {/* Dashboard Placeholder */}
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart2 className="h-6 w-6" />
                        Dashboard de Menciones
                    </CardTitle>
                    <CardDescription>
                        Visualización de las menciones capturadas y análisis de sentimiento.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-64 text-center">
                    <div className="space-y-2">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary/50" />
                        <p className="text-muted-foreground">Esperando la implementación del dashboard...</p>
                    </div>
                </CardContent>
            </Card>

        </div>

        {/* Settings */}
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-6 w-6" />
                        Configuración de APIs
                    </CardTitle>
                    <CardDescription>
                        Ingresa los tokens y claves necesarios para conectar con las redes sociales.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="facebook-token" className="flex items-center gap-2">
                            <Facebook className="h-4 w-4" /> Token de API Graph de Facebook
                        </Label>
                        <Input
                        id="facebook-token"
                        type="password"
                        placeholder="Pega aquí tu token de acceso"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        />
                         <p className="text-xs text-muted-foreground pt-1">
                            Necesario para obtener datos de Facebook.
                        </p>
                    </div>
                    <Button className="w-full" onClick={handleSaveSettings} disabled={isSaving || settingsLoading}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? "Guardando..." : "Guardar Configuración"}
                    </Button>
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
                   <p>¡Esta es la base! La lógica de backend para usar este token debe ser implementada (ej. usando **Firebase Functions**) para:</p>
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

    