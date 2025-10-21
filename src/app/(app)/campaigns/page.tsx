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
import { campaigns as initialCampaigns } from "@/lib/data"
import { Progress } from "@/components/ui/progress"
import type { Campaign } from "@/lib/types"
import { CampaignForm } from "@/components/campaign-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>(initialCampaigns);
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const handleAddNew = () => {
    setSelectedCampaign(null);
    setIsFormOpen(true);
  }

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsFormOpen(true);
  }

  const handleDelete = (campaignId: string) => {
    setCampaigns(campaigns.filter(c => c.id !== campaignId));
  }

  const handleFormSubmit = (campaign: Campaign) => {
    if (selectedCampaign) {
      setCampaigns(campaigns.map(c => c.id === campaign.id ? campaign : c));
    } else {
      setCampaigns([...campaigns, { ...campaign, id: `cam-${Date.now()}` }]);
    }
    setIsFormOpen(false);
  }

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
              {campaigns.map((campaign) => (
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
                      {campaign.status}
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
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(campaign.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
