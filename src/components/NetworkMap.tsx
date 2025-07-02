
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NetworkNode, NetworkEdge } from '@/utils/networkAnalyzer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NetworkMapProps {
  networkNodes: NetworkNode[];
  networkEdges: NetworkEdge[];
}

const NetworkMap: React.FC<NetworkMapProps> = ({ networkNodes, networkEdges }) => {
  // Convert network data to ReactFlow format
  const initialNodes: Node[] = networkNodes.map((node, index) => ({
    id: node.id,
    type: 'default',
    position: { 
      x: Math.cos(index * 2 * Math.PI / networkNodes.length) * 300 + 400,
      y: Math.sin(index * 2 * Math.PI / networkNodes.length) * 300 + 300
    },
    data: { 
      label: (
        <div className="text-center">
          <div className="font-bold text-xs">{node.label}</div>
          <div className="text-xs text-gray-600">{node.type}</div>
          <div className="text-xs">Calls: {node.totalCalls}</div>
        </div>
      )
    },
    style: {
      backgroundColor: node.color,
      color: node.type === 'kingpin' ? 'white' : 'black',
      border: `2px solid ${node.color}`,
      borderRadius: '50%',
      width: node.size,
      height: node.size,
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const initialEdges: Edge[] = networkEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: {
      stroke: edge.type === 'strong' ? '#dc2626' : edge.type === 'medium' ? '#f59e0b' : '#94a3b8',
      strokeWidth: edge.type === 'strong' ? 3 : edge.type === 'medium' ? 2 : 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.type === 'strong' ? '#dc2626' : edge.type === 'medium' ? '#f59e0b' : '#94a3b8',
    },
    label: `${edge.calls} calls`,
    labelStyle: { fontSize: '8px' },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const networkNode = networkNodes.find(n => n.id === node.id);
    if (networkNode) {
      setSelectedNode(networkNode);
    }
  }, [networkNodes]);

  return (
    <div className="h-full flex">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      
      {selectedNode && (
        <div className="w-80 p-4 bg-white border-l border-gray-200 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedNode.label}</span>
                <Badge 
                  variant={
                    selectedNode.type === 'kingpin' ? 'destructive' :
                    selectedNode.type === 'middleman' ? 'default' :
                    selectedNode.type === 'peddler' ? 'secondary' : 'outline'
                  }
                >
                  {selectedNode.type}
                </Badge>
              </CardTitle>
              <CardDescription>Network Analysis Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm">Statistics</h4>
                <div className="text-sm space-y-1">
                  <div>Total Calls: {selectedNode.totalCalls}</div>
                  <div>Total Duration: {Math.round(selectedNode.totalDuration / 60)} minutes</div>
                  <div>Unique Contacts: {selectedNode.uniqueContacts}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm">Connected To</h4>
                <div className="max-h-40 overflow-y-auto">
                  {selectedNode.connections.slice(0, 10).map((connection, index) => (
                    <div key={index} className="text-xs py-1 px-2 bg-gray-100 rounded mb-1">
                      {connection}
                    </div>
                  ))}
                  {selectedNode.connections.length > 10 && (
                    <div className="text-xs text-gray-500">
                      ...and {selectedNode.connections.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NetworkMap;
