
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
import type { NetworkData } from '@/utils/networkAnalyzer';

interface NetworkGraphViewProps {
  data: NetworkData;
  title: string;
  description: string;
}

const NetworkGraphView: React.FC<NetworkGraphViewProps> = ({ data, title, description }) => {
  // Convert network data to ReactFlow format
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const nodes: Node[] = data.nodes.map((node, index) => {
      // Position nodes in a circular layout
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      const radius = Math.min(300, data.nodes.length * 30);
      
      let nodeColor = '#94a3b8'; // Default gray
      let nodeSize = 40;
      
      switch (node.type) {
        case 'kingpin':
          nodeColor = '#dc2626'; // Red
          nodeSize = 80;
          break;
        case 'middleman':
          nodeColor = '#ea580c'; // Orange
          nodeSize = 60;
          break;
        case 'peddler':
          nodeColor = '#2563eb'; // Blue
          nodeSize = 50;
          break;
        case 'external':
          nodeColor = '#6b7280'; // Gray
          nodeSize = 30;
          break;
      }

      return {
        id: node.id,
        type: 'default',
        position: {
          x: Math.cos(angle) * radius + 400,
          y: Math.sin(angle) * radius + 300
        },
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold text-xs">
                {node.id.length > 10 ? `${node.id.slice(-6)}` : node.id}
              </div>
              <div className="text-xs text-gray-600">{node.role}</div>
              <div className="text-xs">Calls: {node.callCount}</div>
            </div>
          )
        },
        style: {
          backgroundColor: nodeColor,
          color: 'white',
          border: '2px solid #fff',
          borderRadius: '50%',
          width: nodeSize,
          height: nodeSize,
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      };
    });

    const edges: Edge[] = data.edges.map((edge) => {
      let edgeColor = '#94a3b8';
      let edgeWidth = Math.min(8, Math.max(1, edge.weight / 10));
      
      if (edge.metadata.dayTime === 'night') {
        edgeColor = '#7c3aed'; // Purple for night calls
      } else if (edge.callCount > 50) {
        edgeColor = '#dc2626'; // Red for high frequency
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'default',
        style: {
          stroke: edgeColor,
          strokeWidth: edgeWidth
        },
        label: `${edge.callCount} calls`,
        labelStyle: {
          fontSize: '10px',
          fill: '#374151'
        }
      };
    });

    return { nodes, edges };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex gap-2">
            <Badge variant="outline">Nodes: {data.statistics.totalNodes}</Badge>
            <Badge variant="outline">Edges: {data.statistics.totalEdges}</Badge>
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span className="text-sm">Kingpin ({data.statistics.kingpins})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span className="text-sm">Middleman ({data.statistics.middlemen})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span className="text-sm">Peddler ({data.statistics.peddlers})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-600"></div>
            <span className="text-sm">External ({data.statistics.externalContacts})</span>
          </div>
        </div>
        
        <div style={{ width: '100%', height: '600px' }} className="border rounded-lg">
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
            />
            <Background variant="dots" gap={12} size={1} />
            <Panel position="top-right">
              <div className="bg-white p-2 rounded shadow text-xs">
                <div>Network Density: {(data.statistics.networkDensity * 100).toFixed(1)}%</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-lg text-red-600">{data.statistics.kingpins}</div>
            <div className="text-gray-600">Kingpins</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-orange-600">{data.statistics.middlemen}</div>
            <div className="text-gray-600">Middlemen</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-blue-600">{data.statistics.peddlers}</div>
            <div className="text-gray-600">Peddlers</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg text-gray-600">{data.statistics.externalContacts}</div>
            <div className="text-gray-600">External</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkGraphView;
