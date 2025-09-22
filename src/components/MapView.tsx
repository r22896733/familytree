import React, { useEffect, useRef, useState } from 'react';
import { Person } from '../types';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

// Declare Leaflet global variable from CDN
declare var L: any;

interface MapViewProps {
  data: Person;
  onMarkerClick: (person: Person) => void;
}

interface Coords {
    lat: number;
    lng: number;
}


const MapView: React.FC<MapViewProps> = ({ data, onMarkerClick }) => {
    const { t } = useLanguage();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersLayer = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([20, 0], 2);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(mapInstance.current);
            markersLayer.current = L.markerClusterGroup();
            mapInstance.current.addLayer(markersLayer.current);
        }
    }, []);

    useEffect(() => {
        const geocodeAndPlot = async () => {
            setIsLoading(true);
            const peopleWithLocations: Person[] = [];
            const traverse = (person: Person) => {
                if (person.location) {
                    peopleWithLocations.push(person);
                }
                if (person.spouse && person.spouse.location) {
                    // Since spouse is not a full Person object, create one for consistency
                    peopleWithLocations.push({ ...person.spouse, id: person.spouse.id } as Person);
                }
                person.children?.forEach(traverse);
            };
            traverse(data);

            const uniqueLocations = [...new Set(peopleWithLocations.map(p => p.location!).filter(Boolean))];
            
            const coordsMap = new Map<string, Coords>();
            const geocodePromises = uniqueLocations.map(async (location) => {
                const coords = await api.geocodeLocation(location);
                if (coords) {
                    coordsMap.set(location, coords);
                }
            });
            
            await Promise.all(geocodePromises);

            if (markersLayer.current) {
                markersLayer.current.clearLayers();
            }

            let markersAdded = false;
            peopleWithLocations.forEach(person => {
                if (person.location) {
                    const coords = coordsMap.get(person.location);
                    if (coords) {
                        const marker = L.marker([coords.lat, coords.lng]);
                        marker.bindPopup(`<b>${person.name}</b><br>${person.location}`);
                        marker.on('click', () => onMarkerClick(person));
                        markersLayer.current.addLayer(marker);
                        markersAdded = true;
                    }
                }
            });

            if (mapInstance.current && markersAdded && markersLayer.current.getBounds().isValid()) {
                 mapInstance.current.fitBounds(markersLayer.current.getBounds().pad(0.5));
            }

            setIsLoading(false);
        };

        if (mapInstance.current) {
            geocodeAndPlot();
        }
    }, [data, onMarkerClick]);

    return (
        <div className="w-full h-full relative">
             {isLoading && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
                    <div className="text-center">
                        <svg className="animate-spin h-10 w-10 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-lg font-semibold text-white">{t('mapView.loading')}</p>
                    </div>
                </div>
            )}
            <div ref={mapRef} className="w-full h-full" id="map"></div>
        </div>
    );
};

export default MapView;
