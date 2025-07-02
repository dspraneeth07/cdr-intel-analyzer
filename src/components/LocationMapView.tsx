
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin } from 'lucide-react';
import type { NetworkData } from '@/utils/networkAnalyzer';

interface LocationMapViewProps {
  data: NetworkData;
  title: string;
}

const LocationMapView: React.FC<LocationMapViewProps> = ({ data, title }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState<string>('');

  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      // Initialize Leaflet map with OpenStreetMap
      map.current = L.map(mapContainer.current).setView([17.3850, 78.4867], 10);

      // Add OpenStreetMap tile layer (no API key required)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.current);

      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Add markers for each node with location
      const nodesWithLocation = data.nodes.filter(node => node.location);
      
      if (nodesWithLocation.length === 0) {
        setMapError('No location data available for the nodes');
        return;
      }

      const markers: L.Marker[] = [];

      nodesWithLocation.forEach(node => {
        if (!node.location || !map.current) return;

        // Create marker color based on role
        let markerColor = '#6b7280';
        let markerSize = 20;
        
        switch (node.type) {
          case 'kingpin':
            markerColor = '#dc2626';
            markerSize = 30;
            break;
          case 'middleman':
            markerColor = '#ea580c';
            markerSize = 25;
            break;
          case 'peddler':
            markerColor = '#2563eb';
            markerSize = 20;
            break;
          case 'external':
            markerColor = '#6b7280';
            markerSize = 15;
            break;
        }

        // Create custom marker HTML
        const customIcon = L.divIcon({
          html: `<div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            background-color: ${markerColor};
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          className: 'custom-marker',
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize/2, markerSize/2]
        });

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

        const marker = L.marker([node.location.lat, node.location.lng], { icon: customIcon })
          .addTo(map.current!)
          .bindPopup(popupContent);
        
        markers.push(marker);
      });

      // Draw connections between nodes
      const connections = data.edges.filter(edge => {
        const sourceNode = data.nodes.find(n => n.id === edge.source);
        const targetNode = data.nodes.find(n => n.id === edge.target);
        return sourceNode?.location && targetNode?.location;
      });

      connections.forEach(edge => {
        const sourceNode = data.nodes.find(n => n.id === edge.source)!;
        const targetNode = data.nodes.find(n => n.id === edge.target)!;
        
        if (!sourceNode.location || !targetNode.location) return;

        // Determine line color and weight based on connection strength
        let lineColor = '#94a3b8';
        let lineWeight = Math.min(8, Math.max(1, edge.weight / 10));
        
        if (edge.metadata.dayTime === 'night') {
          lineColor = '#7c3aed'; // Purple for night calls
        } else if (edge.callCount > 50) {
          lineColor = '#dc2626'; // Red for high frequency
        }

        const polyline = L.polyline([
          [sourceNode.location.lat, sourceNode.location.lng],
          [targetNode.location.lat, targetNode.location.lng]
        ], {
          color: lineColor,
          weight: lineWeight,
          opacity: 0.7
        }).addTo(map.current!);

        polyline.bindPopup(`
          <div class="text-xs">
            <div>Calls: ${edge.callCount}</div>
            <div>Total Duration: ${Math.round(edge.totalDuration / 60)} mins</div>
            <div>Avg Duration: ${Math.round(edge.avgDuration / 60)} mins</div>
          </div>
        `);
      });

      // Fit map to show all markers
      if (markers.length > 1) {
        const group = new L.FeatureGroup(markers);
        map.current!.fitBounds(group.getBounds().pad(0.1));
      } else if (markers.length === 1) {
        map.current!.setView([nodesWithLocation[0].location!.lat, nodesWithLocation[0].location!.lng], 12);
      }

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map.');
    }

    return () => {
      map.current?.remove();
    };
  }, [data]);

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
          Geographic visualization of network participants and their connections using OpenStreetMap
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
          <p>Map powered by OpenStreetMap - no API key required.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMapView;
