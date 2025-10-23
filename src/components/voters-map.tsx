
"use client";

import React from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Voter } from '@/lib/types';


interface VotersMapProps {
    apiKey: string;
    voters: Voter[];
}

const VoterMarker = () => (
    <div
        style={{
            width: '10px',
            height: '10px',
            backgroundColor: 'red',
            borderRadius: '50%',
            opacity: 0.6,
            border: '1px solid darkred',
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
                       <VoterMarker />
                    </AdvancedMarker>
                ))}
            </Map>
        </APIProvider>
    );
}
