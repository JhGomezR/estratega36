
"use client";

import React from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

interface CityData {
  id: string;
  name: string;
  count: number;
  latitude: number;
  longitude: number;
  color: string;
}

interface VotersMapProps {
    apiKey: string;
    cityData: CityData[];
}

const CustomCircle = ({ size, color, title }: { size: number, color: string, title: string }) => {
    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                borderRadius: '50%',
                opacity: 0.6,
                border: `2px solid ${color}`,
                boxShadow: `0 0 5px ${color}`,
            }}
            title={title}
        />
    );
};


export function VotersMap({ apiKey, cityData }: VotersMapProps) {
    const center = { lat: 4.60971, lng: -74.08175 }; // Centered on Bogotá, Colombia

    const maxCount = Math.max(...cityData.map(c => c.count), 1); // Avoid division by zero

    return (
        <APIProvider apiKey={apiKey}>
            <Map
                defaultCenter={center}
                defaultZoom={6}
                mapId="voters-heatmap"
                gestureHandling={'greedy'}
                disableDefaultUI={true}
            >
                {cityData.map((city) => {
                    const scale = Math.sqrt(city.count / maxCount);
                    // Define a min and max size for circles for better visualization
                    const size = Math.max(10, Math.min(100, 50 * scale));
                    
                    return (
                        <AdvancedMarker
                            key={city.id}
                            position={{ lat: city.latitude, lng: city.longitude }}
                            title={`${city.name}: ${city.count} votantes`}
                        >
                           <CustomCircle size={size} color={city.color} title={`${city.name}: ${city.count} votantes`} />
                        </AdvancedMarker>
                    )
                })}
            </Map>
        </APIProvider>
    );
}
