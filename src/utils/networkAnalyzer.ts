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
    console.log('Parsing CSV file:', file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parsed successfully:', results.data.length, 'records');
        resolve(results.data);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
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
  
  // Generate random coordinates around Hyderabad for demo
  return {
    lat: 17.3850 + (Math.random() - 0.5) * 0.5,
    lng: 78.4867 + (Math.random() - 0.5) * 0.5,
    address: cellAddress || 'Unknown Location'
  };
};

const buildNetworkFromCDRs = (processedCDRs: any[]): { nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge> } => {
  console.log('Building network from CDRs:', processedCDRs.length);
  const nodes = new Map<string, NetworkNode>();
  const edges = new Map<string, NetworkEdge>();
  const contacts = new Map<string, Set<string>>();

  // Process each CDR file
  processedCDRs.forEach((cdrData, index) => {
    console.log(`Processing CDR ${index + 1}:`, cdrData.msisdn);
    const { msisdn, provider, mapping } = cdrData;
    
    // Initialize CDR holder node
    if (!nodes.has(msisdn)) {
      nodes.set(msisdn, {
        id: msisdn,
        label: msisdn,
        type: 'peddler',
        role: 'CDR Holder',
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
    if (mapping && Array.isArray(mapping)) {
      mapping.forEach((record: any) => {
        const bParty = record['B Party'] || record.bParty || record['Called Number'];
        if (!bParty || bParty === msisdn) return;

        const duration = parseInt(record.Duration || record.duration || '0') || 0;
        const callType = record['Call Type'] || record.callType || '';
        const time = record.Time || record.time || '12:00';
        const date = record.Date || record.date || '2024-01-01';
        const cellId = record['First Cell ID'] || record.cellId || '';
        const cellAddress = record['First Cell ID Address'] || record.cellAddress || '';
        const imei = record.IMEI || record.imei || '';
        const imsi = record.IMSI || record.imsi || '';

        // Track unique contacts
        contactSet.add(bParty);

        // Update CDR holder node
        cdrNode.callCount++;
        cdrNode.totalDuration += duration;
        
        if (callType.toLowerCase().includes('out')) {
          cdrNode.metadata.outgoingCalls++;
        } else {
          cdrNode.metadata.incomingCalls++;
        }

        // Check if night call (18:00-06:00)
        const hour = parseInt(time.split(':')[0]) || 12;
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
            location: extractLocationFromCDR(''),
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
    }

    contacts.set(msisdn, contactSet);
    cdrNode.uniqueContacts = contactSet.size;
    cdrNode.metadata.avgCallDuration = cdrNode.callCount > 0 ? cdrNode.totalDuration / cdrNode.callCount : 0;
  });

  console.log('Network built - Nodes:', nodes.size, 'Edges:', edges.size);
  return { nodes, edges };
};

const calculateCentralities = (nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge>) => {
  const nodeArray = Array.from(nodes.values());
  const edgeArray = Array.from(edges.values());
  
  nodeArray.forEach(node => {
    const connections = edgeArray.filter(edge => 
      edge.source === node.id || edge.target === node.id
    );
    node.centrality.degree = connections.length;
    node.centrality.betweenness = connections.length * 0.5;
    node.centrality.closeness = connections.length / Math.max(1, nodeArray.length - 1);
    node.centrality.eigenvector = connections.reduce((sum, edge) => sum + edge.weight, 0);
  });
};

const classifyRoles = (nodes: Map<string, NetworkNode>, edges: Map<string, NetworkEdge>) => {
  const nodeArray = Array.from(nodes.values());
  const cdrNodes = nodeArray.filter(node => node.type !== 'external');
  
  if (cdrNodes.length === 0) return;

  cdrNodes.forEach(node => {
    const influenceScore = 
      (node.centrality.degree * 0.2) +
      (node.centrality.betweenness * 0.3) +
      (node.centrality.closeness * 0.2) +
      (node.centrality.eigenvector * 0.3);
    
    node.metadata.influenceScore = influenceScore;
  });

  cdrNodes.sort((a, b) => (b.metadata.influenceScore || 0) - (a.metadata.influenceScore || 0));

  cdrNodes.forEach((node, index) => {
    const incomingRatio = node.metadata.incomingCalls / Math.max(1, node.callCount);
    const nightCallRatio = node.metadata.nightCalls / Math.max(1, node.callCount);
    const uniqueContacts = node.uniqueContacts;
    
    if (index < Math.ceil(cdrNodes.length * 0.1) && 
        incomingRatio > 0.6 && 
        nightCallRatio > 0.4 && 
        uniqueContacts > 5) {
      node.type = 'kingpin';
      node.role = 'Kingpin (High Influence Leader)';
    } else if (node.centrality.betweenness > 2 && 
               incomingRatio > 0.3 && incomingRatio < 0.7 &&
               uniqueContacts > 3) {
      node.type = 'middleman';
      node.role = 'Middleman (Network Bridge)';
    } else {
      node.type = 'peddler';
      node.role = 'Peddler (End User)';
    }
  });
};

const findCommonContacts = (processedCDRs: any[]): string[] => {
  const contactMaps = processedCDRs.map(cdr => {
    const contacts = new Set<string>();
    if (cdr.mapping && Array.isArray(cdr.mapping)) {
      cdr.mapping.forEach((record: any) => {
        const bParty = record['B Party'] || record.bParty || record['Called Number'];
        if (bParty && bParty !== cdr.msisdn) {
          contacts.add(bParty);
        }
      });
    }
    return contacts;
  });

  if (contactMaps.length < 2) return [];

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
  
  const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;
  const networkDensity = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;
  
  return {
    totalNodes,
    totalEdges,
    kingpins,
    middlemen,
    peddlers,
    externalContacts,
    clusters: 1,
    networkDensity
  };
};

export const analyzeNetworkFromCDRs = async (files: File[]): Promise<NetworkAnalysisResult> => {
  try {
    console.log('=== Starting network analysis ===');
    console.log('Files to process:', files.length);
    
    if (files.length === 0) {
      throw new Error('No files provided for analysis');
    }

    // Parse all CDR files with timeout
    const parsedFiles = await Promise.all(
      files.map(async (file) => {
        console.log('Parsing file:', file.name);
        const data = await parseCSVFile(file);
        console.log('File parsed:', file.name, 'Records:', data.length);
        return { fileName: file.name, data };
      })
    );

    console.log('All files parsed successfully');

    // Process each CDR file
    const processedCDRs = parsedFiles.map(({ fileName, data }) => {
      console.log('Processing CDR for file:', fileName);
      const processed = processCDRData(data, fileName);
      console.log('CDR processed:', processed.msisdn, 'Records:', processed.mapping?.length || 0);
      return processed;
    });

    console.log('All CDRs processed, building network...');

    // Build network
    const { nodes: allNodes, edges: allEdges } = buildNetworkFromCDRs(processedCDRs);
    
    if (allNodes.size === 0) {
      throw new Error('No valid network nodes could be created from the provided CDR data');
    }

    // Calculate centralities and classify roles
    calculateCentralities(allNodes, allEdges);
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

    console.log('=== Analysis completed successfully ===');
    console.log('Internal network:', internalNetwork.nodes.length, 'nodes,', internalNetwork.edges.length, 'edges');
    console.log('Full network:', fullNetwork.nodes.length, 'nodes,', fullNetwork.edges.length, 'edges');

    return {
      internalNetwork,
      fullNetwork,
      commonContacts,
      suspiciousPatterns
    };

  } catch (error) {
    console.error('=== Network analysis failed ===');
    console.error('Error details:', error);
    throw new Error(`Failed to analyze CDR network: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
