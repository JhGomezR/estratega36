
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, FileText } from "lucide-react"
import type { Form as FormType } from "@/lib/types"
import { FormForm } from "@/components/form-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"
import { logAudit } from "@/lib/audit-log"

const entityLabels: Record<FormType['targetEntity'], string> = {
    voter: "Votante",
    user: "Usuario",
    campaign: "Campaña"
}

export default function FormsPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const formsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `forms`) : null, [firestore]);
  const { data: formsData, isLoading } = useCollection<FormType>(formsCollectionRef);

  const [selectedForm, setSelectedForm] = React.useState<FormType | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formToDelete, setFormToDelete] = React.useState<FormType | null>(null);

  const forms = React.useMemo(() => {
    return formsData?.filter(f => !f.trash);
  }, [formsData]);

  const handleAddNew = () => {
    setSelectedForm(null);
    setIsFormOpen(true);
  };

  const handleEdit = (form: FormType) => {
    setSelectedForm(form);
    setIsFormOpen(true);
  };

  const confirmDelete = (form: FormType) => {
    setFormToDelete(form);
  };

  const handleDelete = () => {
    if (formToDelete && formsCollectionRef && currentUser) {
      setDocumentNonBlocking(doc(formsCollectionRef, formToDelete.id), { trash: true }, { merge: true });
      logAudit(currentUser.uid, 'form:delete', { formId: formToDelete.id, name: formToDelete.name });
      setFormToDelete(null);
      toast({ title: "Formulario Eliminado", description: "El formulario ha sido movido a la papelera." });
    }
  };

  const handleFormSubmit = (data: Omit<FormType, 'id'>) => {
    if (formsCollectionRef && currentUser) {
      if (selectedForm) {
        setDocumentNonBlocking(doc(formsCollectionRef, selectedForm.id), data, { merge: true });
        logAudit(currentUser.uid, 'form:update', { formId: selectedForm.id, name: data.name });
        toast({ title: "Formulario Actualizado", description: "Los cambios han sido guardados." });
      } else {
        addDocumentNonBlocking(formsCollectionRef, { ...data, trash: false }).then(docRef => {
          if (docRef) logAudit(currentUser.uid, 'form:create', { formId: docRef.id, name: data.name });
        });
        toast({ title: "Formulario Creado", description: "El nuevo formulario ha sido creado." });
      }
    }
    setIsFormOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Formularios</h1>
          <p className="text-muted-foreground">Crea y administra formularios dinámicos para la captura de datos.</p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Formulario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formularios Dinámicos</CardTitle>
          <CardDescription>
            Listado de formularios disponibles en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Formulario</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>N° de Campos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>}
              {!isLoading && forms?.length === 0 && (
                 <TableRow><TableCell colSpan={5} className="text-center h-24">No hay formularios. ¡Crea uno!</TableCell></TableRow>
              )}
              {forms?.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {form.name}
                  </TableCell>
                  <TableCell className="capitalize">{entityLabels[form.targetEntity]}</TableCell>
                  <TableCell>{form.fields.length}</TableCell>
                  <TableCell>
                    <Badge variant={form.status === 'activo' ? 'secondary' : 'outline'}>
                      {form.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(form)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={!!formToDelete && formToDelete.id === form.id} onOpenChange={(open) => !open && setFormToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(form)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción moverá el formulario a la papelera. No podrás utilizarlo para registrar nuevos datos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setFormToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedForm ? "Editar Formulario" : "Nuevo Formulario"}</DialogTitle>
            <DialogDescription>
                {selectedForm ? "Modifica los detalles de este formulario." : "Crea una nueva plantilla de formulario para capturar datos."}
            </DialogDescription>
          </DialogHeader>
          <FormForm
            form={selectedForm}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
