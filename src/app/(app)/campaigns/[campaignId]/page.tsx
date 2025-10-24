
"use client"
import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from 'next/navigation'
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
import { Progress } from "@/components/ui/progress"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import type { Campaign, ManagedList, Campaign as CampaignType } from "@/lib/types"
import { format, parseISO, isToday } from "date-fns"
import { es } from 'date-fns/locale'
import { ArrowLeft, Edit, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CampaignForm } from "@/components/campaign-form"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useCollection } from "@/firebase/firestore/use-collection"
import { collection } from "firebase/firestore"
import { Separator } from "@/components/ui/separator"

const statusColors: Record<string, string> = {
  'En Campaña': 'bg-blue-500 hover:bg-blue-600 text-white',
  'Finalizada': 'bg-green-500 hover:bg-green-600 text-white',
  'Futura': 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900',
};

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter();
  const campaignId = params.campaignId as string;

  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const firestore = useFirestore()
  const campaignRef = useMemoFirebase(() => {
    return firestore && campaignId ? doc(firestore, 'campaigns', campaignId) : null
  }, [firestore, campaignId]);

  const { data: campaign, isLoading } = useDoc<Campaign>(campaignRef);
  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "lists") : null, [firestore]);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);

  const lists = React.useMemo(() => {
    const listsMap: Record<string, ManagedList | undefined> = {};
    if (managedLists) {
        managedLists.forEach(list => {
            listsMap[list.id] = list;
        });
    }
    return listsMap;
  }, [managedLists]);

  const handleFormSubmit = (data: Omit<CampaignType, 'id' | 'progress'>) => {
    if (firestore) {
      const campaignData: Partial<CampaignType> = { ...data };
      if (campaignData.status === 'Finalizada') {
          campaignData.progress = 100;
      }
      
      setDocumentNonBlocking(doc(firestore, 'campaigns', campaignId), campaignData, { merge: true });
    }
    setIsFormOpen(false);
  }

  if (isLoading || listsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  if (!campaign) {
    return (
        <div className="text-center">
            <h1 className="text-2xl font-bold">Campaña no encontrada</h1>
            <p className="text-muted-foreground">La campaña que buscas no existe o fue eliminada.</p>
            <Button onClick={() => router.push('/campaigns')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Campañas
            </Button>
        </div>
    )
  }
  
  const isEndingToday = isToday(parseISO(campaign.endDate));


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-muted-foreground mt-1">{campaign.description}</p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar Campaña
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Estado</p>
             <div className="flex justify-center">
                <Badge className={cn("capitalize text-base", isEndingToday && campaign.status !== 'Finalizada' ? "bg-red-500 text-white" : statusColors[campaign.status] || "bg-gray-400")}>
                    {campaign.status}
                </Badge>
             </div>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Tipo de Campaña</p>
            <p className="text-xl font-bold capitalize">{campaign.campaignType}</p>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Fecha de Inicio</p>
            <p className="text-xl font-bold">{format(parseISO(campaign.startDate), 'PPP', { locale: es })}</p>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Fecha de Fin</p>
             <p className={cn("text-xl font-bold", isEndingToday && campaign.status !== 'Finalizada' && "text-red-500")}>
                {format(parseISO(campaign.endDate), 'PPP', { locale: es })}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <CardTitle>Objetivo y Progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <p className="font-medium text-muted-foreground">Objetivo</p>
                <p className="text-lg">{campaign.goal}</p>
             </div>
             <Separator />
             <div>
                <p className="font-medium text-muted-foreground">Progreso de la Campaña</p>
                 <div className="flex items-center gap-4 mt-2">
                    <Progress value={campaign.progress} className="w-full" />
                    <span className="text-lg font-bold text-primary">{campaign.progress}%</span>
                </div>
             </div>
          </CardContent>
      </Card>


      {campaign.hasInvestors && (
        <Card>
          <CardHeader>
            <CardTitle>Inversionistas</CardTitle>
            <CardDescription>
              Listado de inversionistas que han aportado a la campaña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto Invertido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.investors && campaign.investors.length > 0 ? (
                  campaign.investors.map((investor, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{investor.firstName} {investor.lastName}</TableCell>
                      <TableCell>{investor.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${new Intl.NumberFormat('es-CO').format(investor.investmentAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No hay inversionistas registrados para esta campaña.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Campaña</DialogTitle>
            </DialogHeader>
            <CampaignForm
              campaign={campaign}
              lists={lists}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
    </div>
  )
}
