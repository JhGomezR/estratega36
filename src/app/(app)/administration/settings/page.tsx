
"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useFirestore, useMemoFirebase, useDoc, useCollection } from "@/firebase"
import { doc, collection, writeBatch } from "firebase/firestore"
import type { BrandingSettings, ManagedList } from "@/lib/types"
import { Loader2, PlusCircle, Trash2 } from "lucide-react"
import { saveBrandingSettings, updateList } from "@/app/(app)/administration/settings/actions"
import { useToast } from "@/hooks/use-toast"

function hexToHsl(hex: string): string | null {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r /= 255; 
    g /= 255; 
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hslStringToHex(hsl: string): string {
    if (!hsl) return "#000000";
    const match = hsl.match(/(\d+)\s*(\d+)%\s*(\d+)%/);
    if (!match) return "#000000";
    const [h, s, l] = match.slice(1).map(Number);
    return hslToHex(h, s, l);
}

const ListManager = ({ title, listKey, items, onUpdate, defaultItems = [] }: { title: string, listKey: string, items: string[], onUpdate: (key: string, items: string[]) => void, defaultItems?: readonly string[] }) => {
    const [newItem, setNewItem] = React.useState("");

    const handleAdd = () => {
        if (newItem && !items.includes(newItem)) {
            const updated = [...items, newItem];
            onUpdate(listKey, updated);
            setNewItem("");
        }
    }

    const handleRemove = (itemToRemove: string) => {
        const updated = items.filter(item => item !== itemToRemove);
        onUpdate(listKey, updated);
    }
    
    const isDefaultItem = (item: string) => defaultItems.includes(item);


    return (
        <div className="space-y-2">
            <Label>{title}</Label>
            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                        <Input value={item} readOnly className="flex-1" />
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item)} disabled={isDefaultItem(item)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Nuevo valor"
                />
                <Button variant="outline" size="icon" onClick={handleAdd}>
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

const listTitles: Record<string, string> = {
    identificationTypes: "Tipos de Documento",
    taskPriorities: "Prioridades de Tareas",
    taskStatuses: "Estados de Tareas",
    campaignTypes: "Tipos de Campaña",
    campaignStatuses: "Estados de Campaña",
};

const defaultLists: Record<string, string[]> = {
    campaignStatuses: ['Futura', 'En Campaña', 'Finalizada', 'Archivada'],
    taskPriorities: ['normal', 'alta', 'urgente'],
    taskStatuses: ['pendiente', 'en_curso', 'finalizada', 'archivada'],
    identificationTypes: ['cedula_ciudadania', 'cedula_extranjeria', 'pasaporte'],
    campaignTypes: ['presidencia', 'alcaldia', 'gobernacion'],
}


export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const brandingSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "branding") : null, [firestore]);
  const { data: brandingSettings, isLoading: brandingLoading } = useDoc<BrandingSettings>(brandingSettingsRef);
  
  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "lists") : null, [firestore]);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);

  const [isSaving, setIsSaving] = React.useState(false);
  const [colors, setColors] = React.useState({
    primaryColor: '#1A237E',
    accentColor: '#FFC107',
    sidebarColor: '#141E46',
  });
  
  const lists = React.useMemo(() => {
    const listsMap: Record<string, string[]> = {};
    if (managedLists) {
        managedLists.forEach(list => {
            listsMap[list.id] = list.items;
        });
    }
    return listsMap;
  }, [managedLists]);


  React.useEffect(() => {
    if (firestore && !listsLoading && managedLists?.length === 0) {
        const batch = writeBatch(firestore);
        Object.entries(defaultLists).forEach(([key, value]) => {
            const docRef = doc(firestore, 'lists', key);
            batch.set(docRef, { name: listTitles[key], items: value });
        })
        batch.commit().catch(e => console.error("Error initializing lists", e));
    }
  }, [firestore, listsLoading, managedLists])

  React.useEffect(() => {
    if (brandingSettings) {
      setColors({
        primaryColor: hslStringToHex(brandingSettings.primaryColor) || '#1A237E',
        accentColor: hslStringToHex(brandingSettings.accentColor) || '#FFC107',
        sidebarColor: hslStringToHex(brandingSettings.sidebarColor) || '#141E46',
      });
      updateCssVariables(brandingSettings.primaryColor, brandingSettings.accentColor, brandingSettings.sidebarColor);
    }
  }, [brandingSettings]);
  
  const updateCssVariables = (primaryHsl?: string, accentHsl?: string, sidebarHsl?: string) => {
    const root = document.documentElement;
    if (primaryHsl) root.style.setProperty('--primary', primaryHsl);
    if (accentHsl) root.style.setProperty('--accent', accentHsl);
    if (sidebarHsl) root.style.setProperty('--sidebar-background', sidebarHsl);
  }

  const handleColorChange = (colorName: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [colorName]: value }));
  }
  
  const handleListUpdate = async (listKey: string, newItems: string[]) => {
    try {
        const result = await updateList(listKey, newItems);
        if (!result.success) {
             throw new Error("Server-side list update failed");
        }
    } catch(error) {
         toast({
            variant: "destructive",
            title: "Error al actualizar la lista",
            description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
        });
    }
  }

  const handleSaveColors = async () => {
    setIsSaving(true);
    try {
        const colorSettings = {
            primaryColor: hexToHsl(colors.primaryColor)!,
            accentColor: hexToHsl(colors.accentColor)!,
            sidebarColor: hexToHsl(colors.sidebarColor)!,
        };
        const result = await saveBrandingSettings(colorSettings);

        if (result.success) {
            updateCssVariables(colorSettings.primaryColor, colorSettings.accentColor, colorSettings.sidebarColor);
            toast({
                title: "Configuración guardada",
                description: "Tus cambios de color se han guardado correctamente.",
            });
        } else {
            throw new Error("Server-side save failed");
        }
    } catch (error) {
        console.error("Failed to save settings:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
        });
    } finally {
        setIsSaving(false);
    }
  }

  const isLoading = brandingLoading || listsLoading;

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración de la Plataforma</h1>
            <p className="text-muted-foreground">Personaliza la apariencia y el comportamiento de la aplicación.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Personalización de la Marca</CardTitle>
              <CardDescription>
                Ajusta los colores, el logo y el fondo para que coincidan con la identidad de tu campaña.
              </CardDescription>
            </div>
             <Button onClick={handleSaveColors} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Colores
            </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="primary-color">Color Primario</Label>
            <div className="flex items-center gap-2 col-span-2">
                <Input id="primary-color-picker" type="color" value={colors.primaryColor} onChange={e => handleColorChange('primaryColor', e.target.value)} className="w-12 h-10 p-1" />
                <Input id="primary-color-text" value={colors.primaryColor} onChange={e => handleColorChange('primaryColor', e.target.value)} className="w-40" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="accent-color">Color de Acento</Label>
            <div className="flex items-center gap-2 col-span-2">
                 <Input id="accent-color-picker" type="color" value={colors.accentColor} onChange={e => handleColorChange('accentColor', e.target.value)} className="w-12 h-10 p-1" />
                <Input id="accent-color-text" value={colors.accentColor} onChange={e => handleColorChange('accentColor', e.target.value)} className="w-40" />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="sidebar-color">Color de Barra Lateral</Label>
            <div className="flex items-center gap-2 col-span-2">
                 <Input id="sidebar-color-picker" type="color" value={colors.sidebarColor} onChange={e => handleColorChange('sidebarColor', e.target.value)} className="w-12 h-10 p-1" />
                <Input id="sidebar-color-text" value={colors.sidebarColor} onChange={e => handleColorChange('sidebarColor', e.target.value)} className="w-40" />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <Label htmlFor="logo">Logo de la Campaña</Label>
            <div className="col-span-2">
                <Input id="logo" type="file" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Listas</CardTitle>
          <CardDescription>
            Administra los valores para los campos de selección en la aplicación. Los cambios se guardan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(listTitles).map(key => (
                 <ListManager 
                    key={key}
                    title={listTitles[key]} 
                    listKey={key}
                    items={lists[key] || []} 
                    onUpdate={handleListUpdate} 
                    defaultItems={defaultLists[key]} />
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
