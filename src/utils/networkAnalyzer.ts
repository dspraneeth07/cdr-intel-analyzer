
import { ProcessedCDRData } from './cdrProcessor';

export interface NetworkNode {
  id: string;
  label: string;
  type: 'kingpin' | 'middleman' | 'peddler' | 'regular';
  totalCalls: number;
  totalDuration: number;
  uniqueContacts: number;
  connections: string[];
  size: number;
  color: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  calls: number;
  duration: number;
  type: 'strong' | 'medium' | 'weak';
}

export interface NetworkAnalysis {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  kingpins: NetworkNode[];
  middlemen: NetworkNode[];
  peddlers: NetworkNode[];
  commonContacts: string[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    avgConnectionsPerNode: number;
    networkDensity: number;
  };
}

export const analyzeNetworkData = (cdrDataArray: ProcessedCDRData[]): NetworkAnalysis => {
  console.log('Starting network analysis for', cdrDataArray.length, 'CDR files');
  
  // Extract all CDR numbers and their contacts
  const cdrNumbers = new Set<string>();
  const contactMap = new Map<string, Map<string, { calls: number; duration: number }>>();
  const allContacts = new Set<string>();
  
  // Process each CDR file
  cdrDataArray.forEach(cdrData => {
    const cdrNo = cdrData.msisdn;
    cdrNumbers.add(cdrNo);
    
    if (!contactMap.has(cdrNo)) {
      contactMap.set(cdrNo, new Map());
    }
    
    const cdrContacts = contactMap.get(cdrNo)!;
    
    // Process summary data to get contact relationships
    cdrData.summary.forEach((contact: any) => {
      const bParty = contact['B Party'];
      if (bParty && bParty !== cdrNo) {
        allContacts.add(bParty);
        
        if (!cdrContacts.has(bParty)) {
          cdrContacts.set(bParty, { calls: 0, duration: 0 });
        }
        
        const existing = cdrContacts.get(bParty)!;
        existing.calls += contact['Total Calls'] || 0;
        existing.duration += contact['Total Duration'] || 0;
      }
    });
  });
  
  console.log('Found', cdrNumbers.size, 'CDR numbers and', allContacts.size, 'unique contacts');
  
  // Find common contacts between CDR numbers
  const commonContacts: string[] = [];
  allContacts.forEach(contact => {
    let appearsInCDRs = 0;
    cdrNumbers.forEach(cdrNo => {
      if (contactMap.get(cdrNo)?.has(contact)) {
        appearsInCDRs++;
      }
    });
    
    if (appearsInCDRs >= 2) {
      commonContacts.push(contact);
    }
  });
  
  console.log('Found', commonContacts.length, 'common contacts');
  
  // Create nodes for all participants
  const nodes: NetworkNode[] = [];
  const nodeStats = new Map<string, { totalCalls: number; totalDuration: number; uniqueContacts: number; connections: string[] }>();
  
  // Process CDR numbers
  cdrNumbers.forEach(cdrNo => {
    const contacts = contactMap.get(cdrNo) || new Map();
    let totalCalls = 0;
    let totalDuration = 0;
    const connections: string[] = [];
    
    contacts.forEach((data, contact) => {
      totalCalls += data.calls;
      totalDuration += data.duration;
      connections.push(contact);
    });
    
    nodeStats.set(cdrNo, {
      totalCalls,
      totalDuration,
      uniqueContacts: contacts.size,
      connections
    });
  });
  
  // Process common contacts
  commonContacts.forEach(contact => {
    let totalCalls = 0;
    let totalDuration = 0;
    const connections: string[] = [];
    
    cdrNumbers.forEach(cdrNo => {
      const contactData = contactMap.get(cdrNo)?.get(contact);
      if (contactData) {
        totalCalls += contactData.calls;
        totalDuration += contactData.duration;
        connections.push(cdrNo);
      }
    });
    
    nodeStats.set(contact, {
      totalCalls,
      totalDuration,
      uniqueContacts: connections.length,
      connections
    });
  });
  
  // Classify nodes based on network position and activity
  const allNodeIds = Array.from(nodeStats.keys());
  const kingpins: NetworkNode[] = [];
  const middlemen: NetworkNode[] = [];
  const peddlers: NetworkNode[] = [];
  
  allNodeIds.forEach(nodeId => {
    const stats = nodeStats.get(nodeId)!;
    const isCDRNumber = cdrNumbers.has(nodeId);
    
    // Calculate node type based on connections and activity
    let nodeType: 'kingpin' | 'middleman' | 'peddler' | 'regular' = 'regular';
    let color = '#94a3b8'; // gray for regular
    let size = 20;
    
    if (isCDRNumber) {
      // For CDR numbers, classify based on unique contacts and activity
      if (stats.uniqueContacts >= 10 && stats.totalDuration >= 3600) {
        nodeType = 'kingpin';
        color = '#dc2626'; // red
        size = 40;
        kingpins.push({
          id: nodeId,
          label: nodeId,
          type: nodeType,
          totalCalls: stats.totalCalls,
          totalDuration: stats.totalDuration,
          uniqueContacts: stats.uniqueContacts,
          connections: stats.connections,
          size,
          color
        });
      } else if (stats.uniqueContacts >= 5) {
        nodeType = 'middleman';
        color = '#f59e0b'; // orange
        size = 30;
        middlemen.push({
          id: nodeId,
          label: nodeId,
          type: nodeType,
          totalCalls: stats.totalCalls,
          totalDuration: stats.totalDuration,
          uniqueContacts: stats.uniqueContacts,
          connections: stats.connections,
          size,
          color
        });
      }
    } else {
      // For common contacts, classify based on connections to CDR numbers
      const connectionsToKingpins = stats.connections.filter(conn => {
        const connStats = nodeStats.get(conn);
        return connStats && connStats.uniqueContacts >= 10 && connStats.totalDuration >= 3600;
      }).length;
      
      const connectionsToMiddlemen = stats.connections.filter(conn => {
        const connStats = nodeStats.get(conn);
        return connStats && connStats.uniqueContacts >= 5 && connStats.uniqueContacts < 10;
      }).length;
      
      if (connectionsToKingpins >= 2 && connectionsToMiddlemen >= 1) {
        nodeType = 'middleman';
        color = '#f59e0b'; // orange
        size = 30;
        middlemen.push({
          id: nodeId,
          label: nodeId,
          type: nodeType,
          totalCalls: stats.totalCalls,
          totalDuration: stats.totalDuration,
          uniqueContacts: stats.uniqueContacts,
          connections: stats.connections,
          size,
          color
        });
      } else if (stats.totalCalls >= 20 && connectionsToMiddlemen >= 1) {
        nodeType = 'peddler';
        color = '#10b981'; // green
        size = 25;
        peddlers.push({
          id: nodeId,
          label: nodeId,
          type: nodeType,
          totalCalls: stats.totalCalls,
          totalDuration: stats.totalDuration,
          uniqueContacts: stats.uniqueContacts,
          connections: stats.connections,
          size,
          color
        });
      }
    }
    
    nodes.push({
      id: nodeId,
      label: nodeId,
      type: nodeType,
      totalCalls: stats.totalCalls,
      totalDuration: stats.totalDuration,
      uniqueContacts: stats.uniqueContacts,
      connections: stats.connections,
      size,
      color
    });
  });
  
  // Create edges between connected nodes
  const edges: NetworkEdge[] = [];
  const edgeMap = new Map<string, { calls: number; duration: number }>();
  
  cdrNumbers.forEach(cdrNo => {
    const contacts = contactMap.get(cdrNo) || new Map();
    
    contacts.forEach((data, contact) => {
      if (nodeStats.has(contact)) {
        const edgeId1 = `${cdrNo}-${contact}`;
        const edgeId2 = `${contact}-${cdrNo}`;
        
        if (!edgeMap.has(edgeId1) && !edgeMap.has(edgeId2)) {
          edgeMap.set(edgeId1, { calls: data.calls, duration: data.duration });
          
          let edgeType: 'strong' | 'medium' | 'weak' = 'weak';
          if (data.calls >= 50 || data.duration >= 1800) {
            edgeType = 'strong';
          } else if (data.calls >= 20 || data.duration >= 600) {
            edgeType = 'medium';
          }
          
          edges.push({
            id: edgeId1,
            source: cdrNo,
            target: contact,
            weight: data.calls + (data.duration / 60),
            calls: data.calls,
            duration: data.duration,
            type: edgeType
          });
        }
      }
    });
  });
  
  // Calculate network statistics
  const totalNodes = nodes.length;
  const totalEdges = edges.length;
  const avgConnectionsPerNode = totalNodes > 0 ? totalEdges * 2 / totalNodes : 0;
  const maxPossibleEdges = totalNodes * (totalNodes - 1) / 2;
  const networkDensity = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;
  
  console.log('Network analysis complete:', {
    totalNodes,
    totalEdges,
    kingpins: kingpins.length,
    middlemen: middlemen.length,
    peddlers: peddlers.length,
    commonContacts: commonContacts.length
  });
  
  return {
    nodes,
    edges,
    kingpins,
    middlemen,
    peddlers,
    commonContacts,
    statistics: {
      totalNodes,
      totalEdges,
      avgConnectionsPerNode,
      networkDensity
    }
  };
};
