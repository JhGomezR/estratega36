
"use client"
import React from 'react';
import dynamic from 'next/dynamic';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User, Voter, Role, Campaign } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';

const NetworkHierarchyChart = dynamic(() => import('@/components/network-hierarchy-chart').then(mod => mod.NetworkHierarchyChart), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
});

const ADMIN_ROLE_NAMES = ['admin', 'super_admin', 'super', 'administrador'];

export default function NetworkPage() {
    const firestore = useFirestore();
    const { user: authUser, isLoading: permissionsLoading, hasPermission } = usePermissions();

    const { data: usersData, isLoading: usersLoading } = useCollection<User>(
        useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
    );
    const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
        useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
    );
    const { data: roles, isLoading: rolesLoading } = useCollection<Role>(
      useMemoFirebase(() => (firestore ? collection(firestore, 'roles') : null), [firestore])
    );
    const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(
        useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore])
    );
    
    const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null);

    const activeCampaigns = React.useMemo(() => {
        if (!campaigns || !authUser || !usersData || !hasPermission('campaign:read')) return [];
        const currentUserData = usersData.find(u => u.id === authUser.id);
        
        const userRole = roles?.find(r => r.id === currentUserData?.roleId)?.name.toLowerCase();
        const isAdmin = userRole && ADMIN_ROLE_NAMES.includes(userRole);

        const allActive = campaigns.filter(c => c.status === 'En Campaña');

        if (isAdmin) {
            return allActive;
        }

        return allActive.filter(c => currentUserData?.campaignIds.includes(c.id));
    }, [campaigns, authUser, usersData, roles, hasPermission]);
    
    React.useEffect(() => {
        if (!selectedCampaignId && activeCampaigns.length > 0) {
            setSelectedCampaignId(activeCampaigns[0].id);
        }
    }, [activeCampaigns, selectedCampaignId]);
    
    const { filteredUsers, filteredVoters } = React.useMemo(() => {
        if (!usersData || !voters || !roles || !selectedCampaignId) {
            return { filteredUsers: [], filteredVoters: [] };
        }

        const adminRoleIds = new Set(roles.filter(r => ADMIN_ROLE_NAMES.includes(r.name.toLowerCase())).map(r => r.id));

        const campaignUsers = usersData.filter(user => 
            user.campaignIds.includes(selectedCampaignId) && !adminRoleIds.has(user.roleId)
        );

        const campaignUserIds = new Set(campaignUsers.map(u => u.id));
        const campaignVoters = voters.filter(voter => campaignUserIds.has(voter.promoterId));
        
        return { filteredUsers: campaignUsers, filteredVoters: campaignVoters };

    }, [usersData, voters, roles, selectedCampaignId]);


    const isLoading = usersLoading || votersLoading || rolesLoading || campaignsLoading || permissionsLoading;
    const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mapa de Red Jerárquico</h1>
                    <p className="text-muted-foreground">Visualiza la estructura completa de tu equipo de campaña y sus resultados.</p>
                </div>
                {activeCampaigns.length > 0 && (
                    <Select value={selectedCampaignId ?? ""} onValueChange={setSelectedCampaignId}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Selecciona una campaña" />
                        </SelectTrigger>
                        <SelectContent>
                            {activeCampaigns.map(campaign => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                    {campaign.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Estructura de: {selectedCampaign ? selectedCampaign.name : 'Cargando...'}</CardTitle>
                    <CardDescription>Organigrama desde la dirección hasta los votantes registrados.</CardDescription>
                </CardHeader>
                <CardContent className="h-[700px] w-full p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (selectedCampaign && filteredUsers.length > 0) ? (
                        <NetworkHierarchyChart 
                            campaign={selectedCampaign}
                            users={filteredUsers}
                            voters={filteredVoters}
                            roles={roles || []}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">
                                {activeCampaigns.length === 0 ? "No hay campañas activas para mostrar." : "Selecciona una campaña para ver su estructura."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
