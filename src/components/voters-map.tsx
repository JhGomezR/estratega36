
"use client";

import React from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Voter } from '@/lib/types';

type VoterWithColor = Voter & { color?: string };

interface VotersMapProps {
    apiKey: string;
    voters: VoterWithColor[];
}

const VoterMarker = ({ color }: { color?: string }) => (
    <div
        style={{
            width: '10px',
            height: '10px',
            backgroundColor: color || 'red',
            borderRadius: '50%',
            opacity: 0.7,
            border: `1px solid ${color ? 'darken(color, 20%)' : 'darkred'}`,
        }}
    />
);


export function VotersMap({ apiKey, voters }: VotersMapProps) {
    const center = { lat: 4.60971, lng: -74.08175 }; // Centered on Bogotá, Colombia

    return (
        <APIProvider apiKey={apiKey}>
            <Map
                defaultCenter={center}
                defaultZoom={6}
                mapId="voters-map"
                gestureHandling={'greedy'}
                disableDefaultUI={true}
                className="h-full w-full rounded-lg"
            >
                {voters.map((voter) => (
                    voter.latitude && voter.longitude &&
                    <AdvancedMarker
                        key={voter.id}
                        position={{ lat: voter.latitude, lng: voter.longitude }}
                        title={`${voter.firstName} ${voter.lastName}`}
                    >
                       <VoterMarker color={voter.color} />
                    </AdvancedMarker>
                ))}
            </Map>
        </APIProvider>
    );
}
