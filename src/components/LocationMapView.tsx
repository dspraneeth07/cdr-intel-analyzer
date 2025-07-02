
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin } from 'lucide-react';
import type { NetworkData } from '@/utils/networkAnalyzer';

interface LocationMapViewProps {
  data: NetworkData;
  mapboxToken: string;
  title: string;
}

const LocationMapView: React.FC<LocationMapViewProps> = ({ data, mapboxToken, title }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string>('');

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [78.4867, 17.3850], // Hyderabad, India
        zoom: 10
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        // Add markers for each node with location
        const nodesWithLocation = data.nodes.filter(node => node.location);
        
        if (nodesWithLocation.length === 0) {
          setMapError('No location data available for the nodes');
          return;
        }

        nodesWithLocation.forEach(node => {
          if (!node.location || !map.current) return;

          // Create marker color based on role
          let markerColor = '#6b7280';
          switch (node.type) {
            case 'kingpin':
              markerColor = '#dc2626';
              break;
            case 'middleman':
              markerColor = '#ea580c';
              break;
            case 'peddler':
              markerColor = '#2563eb';
              break;
            case 'external':
              markerColor = '#6b7280';
              break;
          }

          // Create custom marker
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.cssText = `
            width: ${node.type === 'kingpin' ? '30px' : node.type === 'middleman' ? '25px' : '20px'};
            height: ${node.type === 'kingpin' ? '30px' : node.type === 'middleman' ? '25px' : '20px'};
            border-radius: 50%;
            background-color: ${markerColor};
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          // Create popup content
          const popupContent = `
            <div class="p-2">
              <h4 class="font-semibold text-sm">${node.id}</h4>
              <p class="text-xs text-gray-600">${node.role}</p>
              <div class="mt-2 text-xs">
                <div>Calls: ${node.callCount}</div>
                <div>Duration: ${Math.round(node.totalDuration / 60)} mins</div>
                <div>Contacts: ${node.uniqueContacts}</div>
                ${node.metadata.provider ? `<div>Provider: ${node.metadata.provider}</div>` : ''}
              </div>
              <div class="mt-2 text-xs text-gray-500">
                ${node.location?.address || ''}
              </div>
            </div>
          `;

          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false
          }).setHTML(popupContent);

          new mapboxgl.Marker(el)
            .setLngLat([node.location.lng, node.location.lat])
            .setPopup(popup)
            .addTo(map.current!);
        });

        // Draw connections between nodes
        const connections = data.edges
          .filter(edge => {
            const sourceNode = data.nodes.find(n => n.id === edge.source);
            const targetNode = data.nodes.find(n => n.id === edge.target);
            return sourceNode?.location && targetNode?.location;
          })
          .map(edge => {
            const sourceNode = data.nodes.find(n => n.id === edge.source)!;
            const targetNode = data.nodes.find(n => n.id === edge.target)!;
            
            return {
              type: 'Feature',
              properties: {
                callCount: edge.callCount,
                weight: edge.weight
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [sourceNode.location!.lng, sourceNode.location!.lat],
                  [targetNode.location!.lng, targetNode.location!.lat]
                ]
              }
            };
          });

        if (connections.length > 0) {
          map.current!.addSource('connections', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: connections
            }
          });

          map.current!.addLayer({
            id: 'connections',
            type: 'line',
            source: 'connections',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                1, '#94a3b8',
                10, '#f59e0b',
                50, '#dc2626'
              ],
              'line-width': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                1, 1,
                10, 3,
                50, 6
              ],
              'line-opacity': 0.7
            }
          });
        }

        // Fit map to show all markers
        if (nodesWithLocation.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          nodesWithLocation.forEach(node => {
            if (node.location) {
              bounds.extend([node.location.lng, node.location.lat]);
            }
          });
          map.current!.fitBounds(bounds, { padding: 50 });
        }
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      map.current?.remove();
    };
  }, [data, mapboxToken]);

  if (!mapboxToken) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please provide a Mapbox public token to view the location map.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">
              Locations: {data.nodes.filter(n => n.location).length}
            </Badge>
            <Badge variant="outline">
              Connections: {data.edges.length}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Geographic visualization of network participants and their connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mapError && (
          <Alert className="mb-4">
            <AlertDescription>{mapError}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm">Kingpin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-sm">Middleman</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span className="text-sm">Peddler</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-600"></div>
            <span className="text-sm">External</span>
          </div>
        </div>

        <div 
          ref={mapContainer} 
          style={{ width: '100%', height: '600px' }} 
          className="border rounded-lg"
        />
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Click on markers to view detailed information about each participant.</p>
          <p>Line thickness and color indicate connection strength and frequency.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMapView;
