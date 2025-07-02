import Papa from 'papaparse';
import { processCDRData } from './cdrProcessor';

export interface NetworkNode {
  id: string;
  label: string;
  type: 'kingpin' | 'middleman' | 'peddler' | 'external';
  role: string;
  callCount: number;
  totalDuration: number;
  uniqueContacts: number;
  centrality: {
    degree: number;
    betweenness: number;
    closeness: number;
    eigenvector: number;
  };
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  metadata: {
    incomingCalls: number;
    outgoingCalls: number;
    avgCallDuration: number;
    nightCalls: number;
    provider?: string;
    imei?: string[];
    imsi?: string[];
    cellIds?: string[];
    influenceScore?: number;
  };
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  callCount: number;
  totalDuration: number;
  avgDuration: number;
  bidirectional: boolean;
  metadata: {
    firstCall: string;
    lastCall: string;
    nightCalls: number;
    dayTime: 'night' | 'day' | 'mixed';
  };
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    kingpins: number;
    middlemen: number;
    peddlers: number;
    externalContacts: number;
    clusters: number;
    networkDensity: number;
  };
}

export interface NetworkAnalysisResult {
  internalNetwork: NetworkData;
  fullNetwork: NetworkData;
  commonContacts: string[];
  suspiciousPatterns: Array<{
    type: string;
    description: string;
    nodes: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
}

const parseCSVFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

const extractLocationFromCDR = (cellAddress: string): { lat: number; lng: number; address: string } | undefined => {
  if (!cellAddress) return undefined;
  
  // Extract coordinates if present in the address
  const coordMatch = cellAddress.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
      address: cellAddress
    };
  }
  
  // Default locations for major cities in India for demo purposes
  const cityCoords: { [key: string]: { lat: number; lng: number } } = {
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 }
  };
  
  const addressLower = cellAddress.toLowerCase();
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (addressLower.includes(city)) {
      return {
        ...coords,
        address: cellAddress
      };
    }
  }
  
  return undefined;
};

const buildNetworkFromCDRs = (processedCDRs: any[]): { nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge> } => {
  const nodes = new Map<string, NetworkNode>();
  const edges = new Map<string, NetworkEdge>();
  const contacts = new Map<string, Set<string>>();

  // Process each CDR file
  processedCDRs.forEach(cdrData => {
    const { msisdn, provider, mapping } = cdrData;
    
    // Initialize CDR holder node
    if (!nodes.has(msisdn)) {
      nodes.set(msisdn, {
        id: msisdn,
        label: msisdn,
        type: 'peddler', // Will be updated based on analysis
        role: 'Unknown',
        callCount: 0,
        totalDuration: 0,
        uniqueContacts: 0,
        centrality: { degree: 0, betweenness: 0, closeness: 0, eigenvector: 0 },
        metadata: {
          incomingCalls: 0,
          outgoingCalls: 0,
          avgCallDuration: 0,
          nightCalls: 0,
          provider,
          imei: [],
          imsi: [],
          cellIds: []
        }
      });
    }

    const cdrNode = nodes.get(msisdn)!;
    const contactSet = contacts.get(msisdn) || new Set<string>();

    // Process each call record
    mapping.forEach((record: any) => {
      const bParty = record['B Party'];
      if (!bParty || bParty === msisdn) return;

      const duration = parseInt(record.Duration) || 0;
      const callType = record['Call Type'] || '';
      const time = record.Time || '';
      const date = record.Date || '';
      const cellId = record['First Cell ID'] || '';
      const cellAddress = record['First Cell ID Address'] || '';
      const imei = record.IMEI || '';
      const imsi = record.IMSI || '';

      // Track unique contacts
      contactSet.add(bParty);

      // Update CDR holder node
      cdrNode.callCount++;
      cdrNode.totalDuration += duration;
      
      if (callType.toLowerCase().includes('out')) {
        cdrNode.metadata.outgoingCalls++;
      } else if (callType.toLowerCase().includes('in')) {
        cdrNode.metadata.incomingCalls++;
      }

      // Check if night call (18:00-06:00)
      const hour = parseInt(time.split(':')[0]);
      if (hour >= 18 || hour < 6) {
        cdrNode.metadata.nightCalls++;
      }

      // Add IMEI, IMSI, Cell IDs
      if (imei && !cdrNode.metadata.imei!.includes(imei)) {
        cdrNode.metadata.imei!.push(imei);
      }
      if (imsi && !cdrNode.metadata.imsi!.includes(imsi)) {
        cdrNode.metadata.imsi!.push(imsi);
      }
      if (cellId && !cdrNode.metadata.cellIds!.includes(cellId)) {
        cdrNode.metadata.cellIds!.push(cellId);
      }

      // Set location if available
      if (!cdrNode.location && cellAddress) {
        cdrNode.location = extractLocationFromCDR(cellAddress);
      }

      // Initialize B-Party node if not exists
      if (!nodes.has(bParty)) {
        nodes.set(bParty, {
          id: bParty,
          label: bParty,
          type: 'external',
          role: 'External Contact',
          callCount: 0,
          totalDuration: 0,
          uniqueContacts: 0,
          centrality: { degree: 0, betweenness: 0, closeness: 0, eigenvector: 0 },
          metadata: {
            incomingCalls: 0,
            outgoingCalls: 0,
            avgCallDuration: 0,
            nightCalls: 0
          }
        });
      }

      const bPartyNode = nodes.get(bParty)!;
      bPartyNode.callCount++;
      bPartyNode.totalDuration += duration;

      // Create or update edge
      const edgeId = `${msisdn}-${bParty}`;
      const reverseEdgeId = `${bParty}-${msisdn}`;
      
      let edge = edges.get(edgeId) || edges.get(reverseEdgeId);
      
      if (!edge) {
        edge = {
          id: edgeId,
          source: msisdn,
          target: bParty,
          weight: 1,
          callCount: 1,
          totalDuration: duration,
          avgDuration: duration,
          bidirectional: false,
          metadata: {
            firstCall: `${date} ${time}`,
            lastCall: `${date} ${time}`,
            nightCalls: (hour >= 18 || hour < 6) ? 1 : 0,
            dayTime: (hour >= 18 || hour < 6) ? 'night' : 'day'
          }
        };
        edges.set(edgeId, edge);
      } else {
        edge.callCount++;
        edge.weight++;
        edge.totalDuration += duration;
        edge.avgDuration = edge.totalDuration / edge.callCount;
        edge.metadata.lastCall = `${date} ${time}`;
        
        if (hour >= 18 || hour < 6) {
          edge.metadata.nightCalls++;
        }
        
        // Update day time classification
        const nightRatio = edge.metadata.nightCalls / edge.callCount;
        if (nightRatio > 0.7) {
          edge.metadata.dayTime = 'night';
        } else if (nightRatio < 0.3) {
          edge.metadata.dayTime = 'day';
        } else {
          edge.metadata.dayTime = 'mixed';
        }
      }
    });

    contacts.set(msisdn, contactSet);
    cdrNode.uniqueContacts = contactSet.size;
    cdrNode.metadata.avgCallDuration = cdrNode.totalDuration / cdrNode.callCount;
  });

  return { nodes, edges };
};

const calculateCentralities = (nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge>) => {
  const nodeArray = Array.from(nodes.values());
  const edgeArray = Array.from(edges.values());
  
  // Calculate degree centrality
  nodeArray.forEach(node => {
    const connections = edgeArray.filter(edge => 
      edge.source === node.id || edge.target === node.id
    );
    node.centrality.degree = connections.length;
  });

  // Calculate betweenness centrality (simplified)
  nodeArray.forEach(node => {
    let betweenness = 0;
    const nodeConnections = edgeArray.filter(edge => 
      edge.source === node.id || edge.target === node.id
    );
    
    // Count how many shortest paths pass through this node
    nodeConnections.forEach(edge1 => {
      nodeConnections.forEach(edge2 => {
        if (edge1 !== edge2) {
          const other1 = edge1.source === node.id ? edge1.target : edge1.source;
          const other2 = edge2.source === node.id ? edge2.target : edge2.source;
          
          // Check if this node connects two otherwise unconnected nodes
          const directConnection = edgeArray.find(edge => 
            (edge.source === other1 && edge.target === other2) ||
            (edge.source === other2 && edge.target === other1)
          );
          
          if (!directConnection) {
            betweenness++;
          }
        }
      });
    });
    
    node.centrality.betweenness = betweenness;
  });

  // Calculate closeness centrality (simplified)
  nodeArray.forEach(node => {
    const directConnections = edgeArray.filter(edge => 
      edge.source === node.id || edge.target === node.id
    ).length;
    
    // Higher direct connections = higher closeness
    node.centrality.closeness = directConnections / Math.max(1, nodeArray.length - 1);
  });

  // Calculate eigenvector centrality (simplified)
  nodeArray.forEach(node => {
    let eigenvector = 0;
    const connections = edgeArray.filter(edge => 
      edge.source === node.id || edge.target === node.id
    );
    
    connections.forEach(edge => {
      const otherId = edge.source === node.id ? edge.target : edge.source;
      const otherNode = nodes.get(otherId);
      if (otherNode) {
        eigenvector += otherNode.centrality.degree * edge.weight;
      }
    });
    
    node.centrality.eigenvector = eigenvector;
  });
};

const classifyRoles = (nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge>) => {
  const nodeArray = Array.from(nodes.values());
  const cdrNodes = nodeArray.filter(node => node.type !== 'external');
  
  if (cdrNodes.length === 0) return;

  // Sort by influence score (combination of centralities)
  cdrNodes.forEach(node => {
    const influenceScore = 
      (node.centrality.degree * 0.2) +
      (node.centrality.betweenness * 0.3) +
      (node.centrality.closeness * 0.2) +
      (node.centrality.eigenvector * 0.3);
    
    node.metadata.influenceScore = influenceScore;
  });

  cdrNodes.sort((a, b) => (b.metadata.influenceScore || 0) - (a.metadata.influenceScore || 0));

  // Classify roles based on patterns
  cdrNodes.forEach((node, index) => {
    const incomingRatio = node.metadata.incomingCalls / Math.max(1, node.callCount);
    const nightCallRatio = node.metadata.nightCalls / Math.max(1, node.callCount);
    const avgDuration = node.metadata.avgCallDuration;
    const uniqueContacts = node.uniqueContacts;
    
    // Kingpin characteristics:
    // - High influence but fewer direct calls
    // - More incoming calls than outgoing
    // - Many night calls
    // - Connected to many unique contacts
    if (index < Math.ceil(cdrNodes.length * 0.1) && // Top 10%
        incomingRatio > 0.6 && 
        nightCallRatio > 0.4 && 
        uniqueContacts > 5) {
      node.type = 'kingpin';
      node.role = 'Kingpin (High Influence Leader)';
    }
    // Middleman characteristics:
    // - High betweenness centrality
    // - Balanced incoming/outgoing calls
    // - Connects different groups
    else if (node.centrality.betweenness > 2 && 
             incomingRatio > 0.3 && incomingRatio < 0.7 &&
             uniqueContacts > 3) {
      node.type = 'middleman';
      node.role = 'Middleman (Network Bridge)';
    }
    // Peddler characteristics:
    // - Lower centrality scores
    // - More outgoing calls
    // - Fewer unique contacts
    else {
      node.type = 'peddler';
      node.role = 'Peddler (End User)';
    }
  });
};

const findCommonContacts = (processedCDRs: any[]): string[] => {
  const contactMaps = processedCDRs.map(cdr => {
    const contacts = new Set<string>();
    cdr.mapping.forEach((record: any) => {
      const bParty = record['B Party'];
      if (bParty && bParty !== cdr.msisdn) {
        contacts.add(bParty);
      }
    });
    return contacts;
  });

  if (contactMaps.length < 2) return [];

  // Find contacts that appear in at least 2 CDRs
  const commonContacts: string[] = [];
  const contactCounts = new Map<string, number>();

  contactMaps.forEach(contactSet => {
    contactSet.forEach(contact => {
      contactCounts.set(contact, (contactCounts.get(contact) || 0) + 1);
    });
  });

  contactCounts.forEach((count, contact) => {
    if (count >= 2) {
      commonContacts.push(contact);
    }
  });

  return commonContacts;
};

const generateNetworkStatistics = (nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge>) => {
  const nodeArray = Array.from(nodes.values());
  const totalNodes = nodeArray.length;
  const totalEdges = edges.size;
  
  const kingpins = nodeArray.filter(n => n.type === 'kingpin').length;
  const middlemen = nodeArray.filter(n => n.type === 'middleman').length;
  const peddlers = nodeArray.filter(n => n.type === 'peddler').length;
  const externalContacts = nodeArray.filter(n => n.type === 'external').length;
  
  // Calculate network density
  const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;
  const networkDensity = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;
  
  return {
    totalNodes,
    totalEdges,
    kingpins,
    middlemen,
    peddlers,
    externalContacts,
    clusters: 1, // Simplified for now
    networkDensity
  };
};

export const analyzeNetworkFromCDRs = async (files: File[]): Promise<NetworkAnalysisResult> => {
  try {
    console.log('Starting network analysis for', files.length, 'files');
    
    // Parse all CDR files
    const parsedFiles = await Promise.all(
      files.map(async (file) => {
        const data = await parseCSVFile(file);
        return { fileName: file.name, data };
      })
    );

    // Process each CDR file
    const processedCDRs = parsedFiles.map(({ fileName, data }) => {
      return processCDRData(data, fileName);
    });

    console.log('Processed CDRs:', processedCDRs.length);

    // Build internal network (CDR holders only)
    const { nodes: allNodes, edges: allEdges } = buildNetworkFromCDRs(processedCDRs);
    
    // Calculate centralities
    calculateCentralities(allNodes, allEdges);
    
    // Classify roles
    classifyRoles(allNodes, allEdges);

    // Create internal network (CDR holders only)
    const internalNodes = new Map<string, NetworkNode>();
    const internalEdges = new Map<string, NetworkEdge>();
    
    const cdrNumbers = new Set(processedCDRs.map(cdr => cdr.msisdn));
    
    allNodes.forEach((node, id) => {
      if (cdrNumbers.has(id)) {
        internalNodes.set(id, node);
      }
    });
    
    allEdges.forEach((edge, id) => {
      if (cdrNumbers.has(edge.source) && cdrNumbers.has(edge.target)) {
        internalEdges.set(id, edge);
      }
    });

    // Find common contacts
    const commonContacts = findCommonContacts(processedCDRs);

    // Generate statistics
    const internalStats = generateNetworkStatistics(internalNodes, internalEdges);
    const fullStats = generateNetworkStatistics(allNodes, allEdges);

    // Create network data objects
    const internalNetwork: NetworkData = {
      nodes: Array.from(internalNodes.values()),
      edges: Array.from(internalEdges.values()),
      statistics: internalStats
    };

    const fullNetwork: NetworkData = {
      nodes: Array.from(allNodes.values()),
      edges: Array.from(allEdges.values()),
      statistics: fullStats
    };

    // Detect suspicious patterns
    const suspiciousPatterns = [
      {
        type: 'High Night Activity',
        description: 'Nodes with >60% night calls',
        nodes: Array.from(allNodes.values())
          .filter(node => (node.metadata.nightCalls / Math.max(1, node.callCount)) > 0.6)
          .map(node => node.id),
        severity: 'high' as const
      },
      {
        type: 'Common External Contacts',
        description: 'External contacts connected to multiple CDR holders',
        nodes: commonContacts,
        severity: 'medium' as const
      }
    ];

    return {
      internalNetwork,
      fullNetwork,
      commonContacts,
      suspiciousPatterns
    };

  } catch (error) {
    console.error('Network analysis error:', error);
    throw new Error('Failed to analyze CDR network');
  }
};
