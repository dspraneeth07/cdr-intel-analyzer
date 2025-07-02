
import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ConnectionMode,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from 'lucide-react';
import type { NetworkData } from '@/utils/networkAnalyzer';

interface LocationMapViewProps {
  data: NetworkData;
  title: string;
}

const LocationMapView: React.FC<LocationMapViewProps> = ({ data, title }) => {
  // Convert network data to ReactFlow format for network visualization
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    console.log('Converting network data to network graph format:', data);
    
    if (!data.nodes || data.nodes.length === 0) {
      console.log('No nodes found in data');
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = data.nodes.map((node, index) => {
      // Position nodes in a force-directed layout
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      const radius = Math.min(400, data.nodes.length * 40);
      
      let nodeColor = '#94a3b8';
      let nodeSize = 60;
      let borderColor = '#fff';
      
      switch (node.type) {
        case 'kingpin':
          nodeColor = '#dc2626';
          nodeSize = 100;
          borderColor = '#fef2f2';
          break;
        case 'middleman':
          nodeColor = '#ea580c';
          nodeSize = 80;
          borderColor = '#fff7ed';
          break;
        case 'peddler':
          nodeColor = '#2563eb';
          nodeSize = 70;
          borderColor = '#eff6ff';
          break;
        case 'external':
          nodeColor = '#6b7280';
          nodeSize = 50;
          borderColor = '#f9fafb';
          break;
      }

      return {
        id: node.id,
        type: 'default',
        position: {
          x: Math.cos(angle) * radius + 500,
          y: Math.sin(angle) * radius + 400
        },
        data: {
          label: (
            <div className="text-center p-2">
              <div className="font-bold text-sm text-white">
                {node.id.length > 12 ? `***${node.id.slice(-6)}` : node.id}
              </div>
              <div className="text-xs text-white opacity-90">{node.role}</div>
              <div className="text-xs text-white opacity-75">
                {node.callCount} calls
              </div>
              <div className="text-xs text-white opacity-75">
                {node.uniqueContacts} contacts
              </div>
            </div>
          )
        },
        style: {
          backgroundColor: nodeColor,
          color: 'white',
          border: `3px solid ${borderColor}`,
          borderRadius: '12px',
          width: nodeSize,
          height: nodeSize,
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }
      };
    });

    const edges: Edge[] = data.edges.map((edge) => {
      let edgeColor = '#94a3b8';
      let edgeWidth = Math.min(10, Math.max(2, edge.weight / 5));
      
      // Color based on call patterns
      if (edge.metadata.dayTime === 'night') {
        edgeColor = '#7c3aed'; // Purple for night calls
      } else if (edge.callCount > 20) {
        edgeColor = '#dc2626'; // Red for high frequency
      } else if (edge.callCount > 10) {
        edgeColor = '#ea580c'; // Orange for medium frequency
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'default',
        style: {
          stroke: edgeColor,
          strokeWidth: edgeWidth,
          strokeOpacity: 0.8
        },
        label: `${edge.callCount}`,
        labelStyle: {
          fontSize: '12px',
          fill: '#374151',
          fontWeight: 'bold',
          backgroundColor: 'white',
          padding: '2px 4px',
          borderRadius: '4px'
        }
      };
    });

    console.log('Generated network graph - nodes:', nodes.length, 'edges:', edges.length);
    return { nodes, edges };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!data.nodes || data.nodes.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>Network graph visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No network data available to display</p>
          </div>
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
            <Badge variant="outline">Nodes: {data.statistics.totalNodes}</Badge>
            <Badge variant="outline">Connections: {data.statistics.totalEdges}</Badge>
          </div>
        </CardTitle>
        <CardDescription>Interactive network graph showing relationships and communication patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-red-600"></div>
            <span className="text-sm font-medium">Kingpin ({data.statistics.kingpins})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-600"></div>
            <span className="text-sm font-medium">Middleman ({data.statistics.middlemen})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-600"></div>
            <span className="text-sm font-medium">Peddler ({data.statistics.peddlers})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-600"></div>
            <span className="text-sm font-medium">External ({data.statistics.externalContacts})</span>
          </div>
        </div>
        
        <div style={{ width: '100%', height: '700px' }} className="border rounded-lg bg-gray-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const nodeData = data.nodes.find(n => n.id === node.id);
                switch (nodeData?.type) {
                  case 'kingpin': return '#dc2626';
                  case 'middleman': return '#ea580c';
                  case 'peddler': return '#2563eb';
                  default: return '#6b7280';
                }
              }}
              maskColor="rgba(255, 255, 255, 0.2)"
            />
            <Background color="#aaa" gap={16} />
            <Panel position="top-right">
              <div className="bg-white p-3 rounded shadow-lg text-sm border">
                <div className="font-semibold mb-1">Network Analysis</div>
                <div>Density: {(data.statistics.networkDensity * 100).toFixed(1)}%</div>
                <div>Total Calls: {data.edges.reduce((sum, edge) => sum + edge.callCount, 0)}</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="font-bold text-2xl text-red-600">{data.statistics.kingpins}</div>
            <div className="text-sm text-red-700">Key Leaders</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="font-bold text-2xl text-orange-600">{data.statistics.middlemen}</div>
            <div className="text-sm text-orange-700">Coordinators</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="font-bold text-2xl text-blue-600">{data.statistics.peddlers}</div>
            <div className="text-sm text-blue-700">Operators</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-bold text-2xl text-gray-600">{data.statistics.externalContacts}</div>
            <div className="text-sm text-gray-700">External Links</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMapView;
