"use client"
import { AnalysisClient } from "@/components/analysis-client";
import { useUser, useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import type { Campaign, Role, User, Voter } from "@/lib/types";
import { collection, collectionGroup, doc } from "firebase/firestore";
import React from "react";

export const maxDuration = 120; 

export default function AnalysisPage() {
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

  const votersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore]);
  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(votersCollectionRef);
  
  const citiesCollectionGroup = useMemoFirebase(() => firestore ? collectionGroup(firestore, 'cities') : null, [firestore]);
  const { data: allCities, isLoading: citiesLoading } = useCollection<City>(citiesCollectionGroup);


  const activeCampaigns = React.useMemo(() => {
    if (!campaignsData || !user || !currentUserData || !roles) return [];
    
    const allActiveCampaigns = campaignsData.filter(c => c.status === 'En Campaña');

    const adminRoleNames = ['admin', 'super_admin', 'super', 'administrador'];
    const userRole = roles.find(r => r.id === currentUserData.roleId)?.name?.toLowerCase();

    if (userRole && adminRoleNames.includes(userRole)) {
        return allActiveCampaigns;
    }
    
    return allActiveCampaigns.filter(c => 
      currentUserData.campaignIds.includes(c.id)
    );
  }, [campaignsData, currentUserData, roles, user]);

  const isLoading = campaignsLoading || userLoading || rolesLoading || votersLoading || citiesLoading;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análisis de Campaña</h1>
        <p className="text-muted-foreground">
          Selecciona una campaña para obtener un análisis detallado y recomendaciones estratégicas generadas por IA.
        </p>
      </div>
      <AnalysisClient 
        campaigns={activeCampaigns}
        voters={voters || []}
        cities={allCities || []}
        isLoading={isLoading}
      />
    </div>
  )
}
