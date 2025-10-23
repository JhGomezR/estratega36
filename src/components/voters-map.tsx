
"use client";

import React from 'react';
import { APIProvider, Map, Circle } from '@vis.gl/react-google-maps';

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

export function VotersMap({ apiKey, cityData }: VotersMapProps) {
    const center = { lat: 4.60971, lng: -74.08175 }; // Centered on Bogotá, Colombia

    const maxCount = Math.max(...cityData.map(c => c.count), 0);

    return (
        <APIProvider apiKey={apiKey}>
            <Map
                defaultCenter={center}
                defaultZoom={6}
                mapId="voters-heatmap"
                gestureHandling={'greedy'}
                disableDefaultUI={true}
            >
                {cityData.map((city) => (
                    <Circle
                        key={city.id}
                        center={{ lat: city.latitude, lng: city.longitude }}
                        radius={20000 * Math.sqrt(city.count / maxCount)} // Scale radius based on voter count
                        strokeColor={city.color}
                        strokeOpacity={0.8}
                        strokeWeight={2}
                        fillColor={city.color}
                        fillOpacity={0.35}
                        clickable={true}
                        title={`${city.name}: ${city.count} votantes`}
                    />
                ))}
            </Map>
        </APIProvider>
    );
}

    