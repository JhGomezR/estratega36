
"use client"
import React from 'react';
import { useAuth, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { User, Role, Campaign } from '@/lib/types';
import { NetworkTree } from '@/components/network-tree';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NetworkPage() {
    const firestore = useFirestore();
    const auth = useAuth();

    const { data: usersData, isLoading: usersLoading } = useCollection<User>(
        useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
    );
    const { data: roles, isLoading: rolesLoading } = useCollection<Role>(
        useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore])
    );
    const { data: campaigns, isLoading: campaignsLoading } = useCollection<Campaign>(
        useMemoFirebase(() => firestore ? collection(firestore, 'campaigns') : null, [firestore])
    );

    const activeUsers = React.useMemo(() => {
        // Superadmin doesn't need to be filtered out from the tree data itself.
        // The tree starts from campaigns and their assigned root users.
        return usersData?.filter(user => user.status === 'activo');
    }, [usersData]);

    const isLoading = usersLoading || rolesLoading || campaignsLoading;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mapa de Red Jerárquico</h1>
                <p className="text-muted-foreground">Visualiza la estructura completa de tu equipo de campaña.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Estructura del Equipo</CardTitle>
                    <CardDescription>Organigrama desde la dirección hasta los voluntarios.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <NetworkTree users={activeUsers || []} roles={roles || []} campaigns={campaigns || []} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
