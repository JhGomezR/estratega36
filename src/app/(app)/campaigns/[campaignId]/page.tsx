

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
import type { Campaign, ManagedList, Campaign as CampaignType, GeneratedStrategy } from "@/lib/types"
import { format, parseISO, isToday } from "date-fns"
import { es } from 'date-fns/locale'
import { ArrowLeft, Edit, Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionModal } from "@/components/ui/dialog"
import { CampaignForm } from "@/components/campaign-form"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useCollection } from "@/firebase/firestore/use-collection"
import { collection } from "firebase/firestore"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const [selectedStrategy, setSelectedStrategy] = React.useState<GeneratedStrategy | null>(null);

  const firestore = useFirestore()
  const campaignRef = useMemoFirebase(() => {
    return firestore && campaignId ? doc(firestore, 'campaigns', campaignId) : null
  }, [firestore, campaignId]);

  const { data: campaign, isLoading } = useDoc<Campaign>(campaignRef);
  
  const strategiesRef = useMemoFirebase(() => {
      return firestore && campaignId ? collection(firestore, 'campaigns', campaignId, 'generatedStrategies') : null
  }, [firestore, campaignId]);
  const { data: strategies, isLoading: strategiesLoading } = useCollection<GeneratedStrategy>(strategiesRef);

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

  if (isLoading || listsLoading || strategiesLoading) {
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        <Card>
            <CardHeader>
                <CardTitle>Estrategias Generadas por IA</CardTitle>
                <CardDescription>Historial de estrategias creadas para esta campaña.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha de Creación</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {strategies && strategies.length > 0 ? (
                            strategies.sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).map(strategy => (
                                <TableRow key={strategy.id}>
                                    <TableCell>{format(new Date(strategy.generatedAt), "dd/MM/yyyy 'a las' HH:mm")}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedStrategy(strategy)}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Ver
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">No hay estrategias generadas.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>


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
        
      <Dialog open={!!selectedStrategy} onOpenChange={(open) => !open && setSelectedStrategy(null)}>
        <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
                <DialogTitle>Estrategia Generada</DialogTitle>
                <DialogDescriptionModal>
                    Contenido de la estrategia generada el {selectedStrategy ? format(new Date(selectedStrategy.generatedAt), "PPP 'a las' p", {locale: es}) : ''}.
                </DialogDescriptionModal>
            </DialogHeader>
            <ScrollArea className="h-full">
                <div className="space-y-6 pr-6">
                    {selectedStrategy && Object.entries(selectedStrategy.outputs).map(([key, value]) => (
                        <div key={key}>
                            <h3 className="text-lg font-semibold mb-2 capitalize">{key.replace(/_/g, ' ')}</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
                            <Separator className="mt-4" />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
    </div>
  )
}
