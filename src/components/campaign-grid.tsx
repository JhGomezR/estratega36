
"use client"
import * as React from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Skeleton } from "./ui/skeleton"

interface CampaignGridProps {
  campaigns: Campaign[];
  isLoading: boolean;
  statusColors: Record<string, string>;
}

const CampaignCard = ({ campaign, statusColors }: { campaign: Campaign; statusColors: Record<string, string> }) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle>{campaign.name}</CardTitle>
            <Badge className={cn("capitalize", statusColors[campaign.status] || "bg-gray-400")}>
              {campaign.status}
            </Badge>
        </div>
        <CardDescription className="capitalize pt-1">{campaign.campaignType}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{campaign.description}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <Link href={`/campaigns/${campaign.id}`}>Ver Detalles</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function CampaignGrid({ campaigns, isLoading, statusColors }: CampaignGridProps) {
  const currentCampaigns = campaigns.filter(c => c.status === 'En Campaña' || c.status === 'Futura');
  const pastCampaigns = campaigns.filter(c => c.status === 'Finalizada');

  if (isLoading) {
      return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-60 w-full" />
                    <Skeleton className="h-60 w-full" />
                </div>
            </div>
             <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-60 w-full" />
                </div>
            </div>
        </div>
      )
  }

  if (campaigns.length === 0) {
     return (
        <div className="text-center py-20 bg-card rounded-lg border">
            <h3 className="text-xl font-semibold">No se encontraron campañas</h3>
            <p className="text-muted-foreground mt-2">Intenta con otra búsqueda o crea una nueva campaña.</p>
        </div>
      )
  }

  return (
    <div className="space-y-8">
      {currentCampaigns.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Campañas Actuales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} statusColors={statusColors} />
            ))}
          </div>
        </div>
      )}

      {pastCampaigns.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Campañas Pasadas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} statusColors={statusColors} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
