"use client";

import React from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Voter } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface VotersMapProps {
    apiKey: string;
}

export function VotersMap({ apiKey }: VotersMapProps) {
    const firestore = useFirestore();
    const votersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore]);
    const { data: voters, isLoading } = useCollection<Voter>(votersCollection);

    const votersWithCoords = React.useMemo(() => {
        return voters?.filter(voter => voter.latitude != null && voter.longitude != null) || [];
    }, [voters]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando votantes...</span>
            </div>
        );
    }
    
    const center = { lat: 4.60971, lng: -74.08175 }; // Centered on Bogotá, Colombia

    return (
        <APIProvider apiKey={apiKey}>
            <Map
                defaultCenter={center}
                defaultZoom={6}
                mapId="voters-map"
                gestureHandling={'greedy'}
                disableDefaultUI={true}
            >
                {votersWithCoords.map((voter) => (
                    <AdvancedMarker
                        key={voter.id}
                        position={{ lat: voter.latitude!, lng: voter.longitude! }}
                        title={`${voter.firstName} ${voter.lastName}`}
                    />
                ))}
            </Map>
        </APIProvider>
    );
}
