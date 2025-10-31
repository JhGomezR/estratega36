"use client"
import React from 'react';
import dynamic from 'next/dynamic';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Carga dinámica del componente del árbol sin SSR
const NetworkTreeClient = dynamic(() => import('@/components/network-tree-client').then(mod => mod.NetworkTreeClient), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
});

export default function NetworkPage() {
    const firestore = useFirestore();

    const { data: usersData, isLoading: usersLoading } = useCollection<User>(
        useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
    );
    const { data: roles, isLoading: rolesLoading } = useCollection<Role>(
        useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore])
    );
    const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(
        useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore])
    );
    const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
        useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
    );

    const activeUsers = React.useMemo(() => {
        if (!usersData || !roles) return [];
        
        const adminRoleNames = ['admin', 'super_admin', 'super', 'administrador'];
        const adminRoleIds = roles
            .filter(r => adminRoleNames.includes(r.name.toLowerCase()))
            .map(r => r.id);

        return usersData.filter(user => 
            user.status === 'activo' && 
            !adminRoleIds.includes(user.roleId)
        );
    }, [usersData, roles]);
    
    const isLoading = usersLoading || rolesLoading || campaignsLoading || votersLoading;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mapa de Red Jerárquico</h1>
                <p className="text-muted-foreground">Visualiza la estructura completa de tu equipo de campaña y sus resultados.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Estructura del Equipo</CardTitle>
                    <CardDescription>Organigrama desde la dirección hasta los votantes registrados.</CardDescription>
                </CardHeader>
                <CardContent className="h-[700px] w-full p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <NetworkTreeClient 
                            users={activeUsers || []} 
                            roles={roles || []} 
                            campaigns={campaigns || []}
                            voters={voters || []}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
