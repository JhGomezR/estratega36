
"use client"
import * as React from "react"
import { useParams } from 'next/navigation'
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
import type { Campaign } from "@/lib/types"
import { format, parseISO, isToday } from "date-fns"
import { es } from 'date-fns/locale'
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  'En Campaña': 'bg-blue-500 hover:bg-blue-600 text-white',
  'Finalizada': 'bg-green-500 hover:bg-green-600 text-white',
  'Futura': 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900',
};

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.campaignId as string;

  const firestore = useFirestore()
  const campaignRef = useMemoFirebase(() => {
    return firestore && campaignId ? doc(firestore, 'campaigns', campaignId) : null
  }, [firestore, campaignId]);

  const { data: campaign, isLoading } = useDoc<Campaign>(campaignRef);

  if (isLoading) {
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
        </div>
    )
  }
  
  const isEndingToday = isToday(parseISO(campaign.endDate));


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
        <p className="text-muted-foreground mt-1">{campaign.description}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado</CardTitle>
          </CardHeader>
          <CardContent>
             <Badge className={cn("capitalize text-base", isEndingToday && campaign.status !== 'Finalizada' ? "bg-red-500 text-white" : statusColors[campaign.status] || "bg-gray-400")}>
                {campaign.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de Campaña</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{campaign.campaignType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fecha de Inicio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{format(parseISO(campaign.startDate), 'PPP', { locale: es })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fecha de Fin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", isEndingToday && campaign.status !== 'Finalizada' && "text-red-500")}>
                {format(parseISO(campaign.endDate), 'PPP', { locale: es })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Objetivo y Progreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <p className="font-medium text-muted-foreground">Objetivo</p>
                <p className="text-lg">{campaign.goal}</p>
             </div>
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
    </div>
  )
}
