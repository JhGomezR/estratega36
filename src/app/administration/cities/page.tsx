"use client"
import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, ChevronRight, Building, Globe, MapPin } from "lucide-react"
import type { City, Department, Country } from "@/lib/types"
import { CityForm } from "@/components/city-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleElement,
} from "@/components/ui/alert-dialog"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { collection, doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type FormMode = 'country' | 'department' | 'city';

export default function CitiesPage() {
  const firestore = useFirestore();

  // State for selections
  const [selectedCountryId, setSelectedCountryId] = React.useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string | null>(null);

  // State for forms and dialogs
  const [formMode, setFormMode] = React.useState<FormMode | null>(null);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<{ type: FormMode, path: string, name: string} | null>(null);


  // Data fetching
  const countriesRef = useMemoFirebase(() => firestore ? collection(firestore, `countries`) : null, [firestore]);
  const { data: countries, isLoading: countriesLoading } = useCollection<Country>(countriesRef);

  const departmentsRef = useMemoFirebase(() => firestore && selectedCountryId ? collection(firestore, `countries/${selectedCountryId}/departments`) : null, [firestore, selectedCountryId]);
  const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsRef);

  const citiesRef = useMemoFirebase(() => firestore && selectedCountryId && selectedDepartmentId ? collection(firestore, `countries/${selectedCountryId}/departments/${selectedDepartmentId}/cities`) : null, [firestore, selectedCountryId, selectedDepartmentId]);
  const { data: cities, isLoading: citiesLoading } = useCollection<City>(citiesRef);
  
  // Reset selections when parent changes
  React.useEffect(() => {
    setSelectedDepartmentId(null);
  }, [selectedCountryId]);
  
  const handleAddNew = (mode: FormMode) => {
    setFormMode(mode);
    setEditingItem(null);
  }
  
  const handleEdit = (mode: FormMode, item: any) => {
    setFormMode(mode);
    setEditingItem(item);
  }

  const confirmDelete = (type: FormMode, item: any) => {
    let path = '';
    if (type === 'country') path = `countries/${item.id}`;
    if (type === 'department') path = `countries/${selectedCountryId}/departments/${item.id}`;
    if (type === 'city') path = `countries/${selectedCountryId}/departments/${selectedDepartmentId}/cities/${item.id}`;
    setItemToDelete({ type, path, name: item.name });
  }

  const handleDelete = () => {
    if (!itemToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, itemToDelete.path));
    setItemToDelete(null);
  }
  
  const handleFormSubmit = (data: any) => {
    if (!firestore) return;
    
    let collectionRef;
    if (formMode === 'country') {
      collectionRef = countriesRef;
    } else if (formMode === 'department') {
      collectionRef = departmentsRef;
    } else if (formMode === 'city') {
      collectionRef = citiesRef;
    }

    if (collectionRef) {
      if (editingItem) {
        setDocumentNonBlocking(doc(collectionRef, editingItem.id), data, { merge: true });
      } else {
        addDocumentNonBlocking(collectionRef, data);
      }
    }
    setFormMode(null);
    setEditingItem(null);
  }

  const ListItem = ({ item, isSelected, onClick, onEdit, onDelete, icon }: { item: any, isSelected: boolean, onClick: () => void, onEdit: () => void, onDelete: () => void, icon: React.ReactNode }) => (
    <div className={cn("flex items-center justify-between p-2 rounded-md cursor-pointer", isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
        <div className="flex items-center gap-3 flex-1" onClick={onClick}>
            {icon}
            <span className="font-medium flex-1 truncate">{item.name}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión Geográfica</h1>
        <p className="text-muted-foreground">Administra los países, departamentos y ciudades de la campaña.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Countries Column */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Países</CardTitle>
                <CardDescription>Selecciona un país.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleAddNew('country')}><PlusCircle className="mr-2 h-4 w-4"/>Añadir</Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
                {countriesLoading ? <p>Cargando...</p> :
                 countries?.map(country => (
                     <ListItem 
                        key={country.id}
                        item={country}
                        isSelected={selectedCountryId === country.id}
                        onClick={() => setSelectedCountryId(country.id)}
                        onEdit={() => handleEdit('country', country)}
                        onDelete={() => confirmDelete('country', country)}
                        icon={<Globe className="h-5 w-5" />}
                     />
                 ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Departments Column */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
             <div className="space-y-1">
                <CardTitle>Departamentos</CardTitle>
                <CardDescription>Selecciona un dpto.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleAddNew('department')} disabled={!selectedCountryId}><PlusCircle className="mr-2 h-4 w-4"/>Añadir</Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
                {departmentsLoading ? <p>Cargando...</p> : !selectedCountryId ? <p className="text-muted-foreground text-sm text-center pt-4">Selecciona un país.</p> :
                 departments?.map(dept => (
                      <ListItem 
                        key={dept.id}
                        item={dept}
                        isSelected={selectedDepartmentId === dept.id}
                        onClick={() => setSelectedDepartmentId(dept.id)}
                        onEdit={() => handleEdit('department', dept)}
                        onDelete={() => confirmDelete('department', dept)}
                        icon={<MapPin className="h-5 w-5" />}
                     />
                 ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Cities Column */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
             <div className="space-y-1">
                <CardTitle>Ciudades</CardTitle>
                <CardDescription>Municipios.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => handleAddNew('city')} disabled={!selectedDepartmentId}><PlusCircle className="mr-2 h-4 w-4"/>Añadir</Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
                {citiesLoading ? <p>Cargando...</p> : !selectedDepartmentId ? <p className="text-muted-foreground text-sm text-center pt-4">Selecciona un departamento.</p> :
                 cities?.map(city => (
                    <div key={city.id} className="p-2 rounded-md hover:bg-muted flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <Building className="h-5 w-5" />
                           <span className="font-medium">{city.name}</span>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit('city', city)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => confirmDelete('city', city)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                 ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
       <Dialog open={!!formMode} onOpenChange={(open) => !open && setFormMode(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar' : 'Nuevo'} {formMode === 'country' ? 'País' : formMode === 'department' ? 'Departamento' : 'Ciudad'}</DialogTitle>
            </DialogHeader>
            {formMode === 'country' && (
                <div className="space-y-4 py-4">
                    <Input placeholder="Nombre del país" defaultValue={editingItem?.name} onBlur={(e) => handleFormSubmit({ name: e.target.value })} autoFocus/>
                </div>
            )}
            {formMode === 'department' && (
                 <div className="space-y-4 py-4">
                    <Input placeholder="Nombre del departamento" defaultValue={editingItem?.name} onBlur={(e) => handleFormSubmit({ name: e.target.value })} autoFocus/>
                </div>
            )}
             {formMode === 'city' && (
                 <CityForm
                    city={editingItem}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setFormMode(null)}
                />
            )}
          </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitleElement>¿Estás seguro?</AlertDialogTitleElement>
              <AlertDialogDescription>
                Esta acción eliminará <span className="font-bold">{itemToDelete?.name}</span> y todo su contenido anidado (departamentos, ciudades). Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80">Eliminar Definitivamente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}
