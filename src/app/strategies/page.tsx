
"use client"
import { StrategiesClient } from "@/components/strategies-client";
import { useUser, useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import type { Campaign, Role, User } from "@/lib/types";
import { collection, doc } from "firebase/firestore";
import React from "react";

export const maxDuration = 120; // Aumenta el timeout a 2 minutos

export default function StrategiesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const { data: campaignsData, isLoading: campaignsLoading } = useCollection<Campaign>(
    useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore])
  );
  
  const userRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: currentUserData, isLoading: userLoading } = useDoc<User>(userRef);

  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(
    useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore])
  );

  const activeCampaigns = React.useMemo(() => {
    if (!campaignsData || !user || !currentUserData || !roles) return [];
    
    const allActiveCampaigns = campaignsData.filter(c => c.status === 'En Campaña');

    const adminRoleNames = ['admin', 'super_admin', 'super', 'administrador'];
    const userRole = roles.find(r => r.id === currentUserData.roleId)?.name?.toLowerCase();

    if (userRole && adminRoleNames.includes(userRole)) {
        return allActiveCampaigns;
    }
    
    // For non-admin users, filter by their assigned campaigns.
    return allActiveCampaigns.filter(c => 
      currentUserData.campaignIds.includes(c.id)
    );
  }, [campaignsData, currentUserData, roles, user]);

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
        isLoading={campaignsLoading || userLoading || rolesLoading}
      />
    </div>
  )
}
