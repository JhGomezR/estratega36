
"use client"
import { StrategiesClient } from "@/components/strategies-client";
import { useAuth, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Campaign, User } from "@/lib/types";
import { collection } from "firebase/firestore";
import React from "react";

export const maxDuration = 120; // Aumenta el timeout a 2 minutos

export default function StrategiesPage() {
  const firestore = useFirestore();
  const { user } = useAuth();

  const { data: campaignsData, isLoading: campaignsLoading } = useCollection<Campaign>(
    useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore])
  );
  
  const { data: currentUserData, isLoading: userLoading } = useCollection<User>(
    useMemoFirebase(() => (firestore && user) ? collection(firestore, 'users') : null, [firestore, user])
  );

  const activeCampaigns = React.useMemo(() => {
    if (!campaignsData || !currentUserData || !user) return [];
    
    const userProfile = currentUserData.find(u => u.id === user.uid);
    if (!userProfile) return [];
    
    return campaignsData.filter(c => 
      c.status === 'En Campaña' && userProfile.campaignIds.includes(c.id)
    );
  }, [campaignsData, currentUserData, user]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generador de Estrategias con IA</h1>
        <p className="text-muted-foreground">
          Crea estrategias de campaña detalladas y efectivas basadas en datos.
        </p>
      </div>
      <StrategiesClient 
        campaigns={activeCampaigns}
        isLoading={campaignsLoading || userLoading}
      />
    </div>
  )
}
