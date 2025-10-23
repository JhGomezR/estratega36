"use client"
import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { Campaign, Settings } from "@/lib/types"
import { CampaignForm } from "@/components/campaign-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { collection, doc } from "firebase/firestore"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function CampaignsPage() {
  const firestore = useFirestore();
  const campaignsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore]);
  const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsCollection);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "app") : null, [firestore]);
  const { data: settings, isLoading: settingsLoading } = useDoc<Settings>(settingsRef);
  
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [campaignToDelete, setCampaignToDelete] = React.useState<Campaign | null>(null);

  const handleAddNew = () => {
    setSelectedCampaign(null);
    setIsFormOpen(true);
  }

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsFormOpen(true);
  }
  
  const confirmDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
  }

  const handleDelete = () => {
    if (firestore && campaignToDelete) {
      deleteDocumentNonBlocking(doc(firestore, 'campaigns', campaignToDelete.id));
      setCampaignToDelete(null);
    }
  }

  const handleFormSubmit = (data: Omit<Campaign, 'id' | 'progress'>) => {
    if (firestore) {
      if (selectedCampaign) {
        setDocumentNonBlocking(doc(firestore, 'campaigns', selectedCampaign.id), data, { merge: true });
      } else {
        addDocumentNonBlocking(collection(firestore, 'campaigns'), {
          ...data,
          progress: 0,
        });
      }
    }
    setIsFormOpen(false);
  }

  const getStatusLabel = (statusValue: string) => {
      return settings?.campaignStatuses?.find(s => s === statusValue) || statusValue;
  }

  const isLoading = campaignsLoading || settingsLoading;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Campañas</h1>
          <p className="text-muted-foreground">Administra y monitorea tus campañas políticas.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedCampaign ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
            </DialogHeader>
            <CampaignForm
              campaign={selectedCampaign}
              settings={settings}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Campañas</CardTitle>
          <CardDescription>
            Un listado de todas las campañas en tu sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Fecha de Fin</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Cargando...</TableCell>
                </TableRow>
              )}
              {campaigns?.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="capitalize">{campaign.campaignType}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        campaign.status === "active"
                          ? "default"
                          : campaign.status === "completed"
                          ? "secondary"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={campaign.progress} className="w-24" />
                        <span>{campaign.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{campaign.endDate}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={!!campaignToDelete && campaignToDelete.id === campaign.id} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(campaign)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la campaña.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
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
    </div>
  )
}
