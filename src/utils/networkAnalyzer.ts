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
        if (results.data.length === 0) {
          reject(new Error('CSV file is empty or has no valid data'));
          return;
        }
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
  console.log('Building REAL network from CDRs:', processedCDRs.length);
  const nodes = new Map<string, NetworkNode>();
  const edges = new Map<string, NetworkEdge>();
  const contacts = new Map<string, Set<string>>();

  // Process each CDR file to build actual network
  processedCDRs.forEach((cdrData, index) => {
    console.log(`Processing CDR ${index + 1}:`, cdrData.msisdn, 'Records:', cdrData.mapping?.length || 0);
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
          cellIds: [],
          influenceScore: 0
        }
      });
    }

    const cdrNode = nodes.get(msisdn)!;
    const contactSet = contacts.get(msisdn) || new Set<string>();

    // Process actual call records from CDR
    if (mapping && Array.isArray(mapping)) {
      mapping.forEach((record: any) => {
        // Extract B-Party number from various possible field names
        const bParty = record['B Party'] || record.bParty || record['Called Number'] || 
                      record['Called_Number'] || record['B_Party'] || record['CALLED_NUMBER'];
        
        if (!bParty || bParty === msisdn || bParty === '') return;

        const duration = parseInt(record.Duration || record.duration || record['Call Duration'] || '0') || 0;
        const callType = (record['Call Type'] || record.callType || record['CALL_TYPE'] || '').toLowerCase();
        const time = record.Time || record.time || record['Call Time'] || '12:00';
        const date = record.Date || record.date || record['Call Date'] || '2024-01-01';

        console.log(`Processing call: ${msisdn} -> ${bParty}, Duration: ${duration}, Type: ${callType}`);

        // Track unique contacts
        contactSet.add(bParty);

        // Update CDR holder node with real data
        cdrNode.callCount++;
        cdrNode.totalDuration += duration;
        
        if (callType.includes('out') || callType.includes('outgoing')) {
          cdrNode.metadata.outgoingCalls++;
        } else {
          cdrNode.metadata.incomingCalls++;
        }

        // Check if night call (18:00-06:00)
        const hour = parseInt(time.split(':')[0]) || 12;
        if (hour >= 18 || hour < 6) {
          cdrNode.metadata.nightCalls++;
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
              nightCalls: 0,
              influenceScore: 0
            }
          });
        }

        const bPartyNode = nodes.get(bParty)!;
        bPartyNode.callCount++;
        bPartyNode.totalDuration += duration;

        // Create or update edge between nodes
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

  console.log('REAL Network built - Nodes:', nodes.size, 'Edges:', edges.size);
  
  // Log some sample data to verify it's real
  const sampleNode = Array.from(nodes.values())[0];
  if (sampleNode) {
    console.log('Sample node data:', {
      id: sampleNode.id,
      callCount: sampleNode.callCount,
      uniqueContacts: sampleNode.uniqueContacts,
      role: sampleNode.role
    });
  }
  
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

  // Calculate influence scores based on real CDR data
  cdrNodes.forEach(node => {
    const influenceScore = 
      (node.centrality.degree * 0.25) +
      (node.centrality.betweenness * 0.25) +
      (node.uniqueContacts * 0.2) +
      (node.callCount * 0.15) +
      (node.metadata.nightCalls * 0.15);
    
    node.metadata.influenceScore = influenceScore;
  });

  // Sort by influence for role classification
  cdrNodes.sort((a, b) => (b.metadata.influenceScore || 0) - (a.metadata.influenceScore || 0));

  // Classify roles based on real patterns
  cdrNodes.forEach((node, index) => {
    const incomingRatio = node.metadata.incomingCalls / Math.max(1, node.callCount);
    const nightCallRatio = node.metadata.nightCalls / Math.max(1, node.callCount);
    const uniqueContacts = node.uniqueContacts;
    const avgCallDuration = node.metadata.avgCallDuration;
    
    console.log(`Analyzing node ${node.id}: calls=${node.callCount}, contacts=${uniqueContacts}, nightRatio=${nightCallRatio.toFixed(2)}`);
    
    // Kingpin: High influence, many contacts, receives many calls
    if (index < Math.ceil(cdrNodes.length * 0.15) && 
        incomingRatio > 0.4 && 
        uniqueContacts > Math.max(3, cdrNodes.length * 0.3)) {
      node.type = 'kingpin';
      node.role = 'Kingpin (Network Leader)';
      console.log(`Classified ${node.id} as KINGPIN`);
    } 
    // Middleman: Medium influence, bridges connections
    else if (node.centrality.betweenness > 1 && 
             uniqueContacts > Math.max(2, cdrNodes.length * 0.2) &&
             incomingRatio > 0.2) {
      node.type = 'middleman';
      node.role = 'Middleman (Network Bridge)';
      console.log(`Classified ${node.id} as MIDDLEMAN`);
    } 
    // Peddler: Lower influence, end user
    else {
      node.type = 'peddler';
      node.role = 'Peddler (End User)';
      console.log(`Classified ${node.id} as PEDDLER`);
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
    console.log('=== Starting REAL CDR network analysis ===');
    console.log('Files to process:', files.length);
    
    if (files.length === 0) {
      throw new Error('No files provided for analysis');
    }

    // Parse all CDR files
    const parsedFiles = await Promise.all(
      files.map(async (file) => {
        console.log('Parsing CDR file:', file.name);
        const data = await parseCSVFile(file);
        console.log('CDR file parsed:', file.name, 'Records:', data.length);
        
        // Log sample record to understand structure
        if (data.length > 0) {
          console.log('Sample CDR record:', Object.keys(data[0]));
        }
        
        return { fileName: file.name, data };
      })
    );

    // Process each CDR file using the processor
    const processedCDRs = parsedFiles.map(({ fileName, data }) => {
      console.log('Processing CDR data for:', fileName);
      const processed = processCDRData(data, fileName);
      console.log('CDR processed - MSISDN:', processed.msisdn, 'Mapped records:', processed.mapping?.length || 0);
      
      // Log some sample processed data
      if (processed.mapping && processed.mapping.length > 0) {
        const sample = processed.mapping[0];
        console.log('Sample processed record:', sample);
      }
      
      return processed;
    });

    console.log('All CDRs processed, building REAL network...');

    // Build network from actual CDR data
    const { nodes: allNodes, edges: allEdges } = buildNetworkFromCDRs(processedCDRs);
    
    if (allNodes.size === 0) {
      throw new Error('No valid network nodes could be created. Please check CDR file format.');
    }

    console.log('REAL network built successfully!');

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

    // Detect suspicious patterns from real data
    const suspiciousPatterns = [
      {
        type: 'High Night Activity',
        description: 'Numbers with >50% night calls (suspicious timing)',
        nodes: Array.from(allNodes.values())
          .filter(node => (node.metadata.nightCalls / Math.max(1, node.callCount)) > 0.5)
          .map(node => node.id),
        severity: 'high' as const
      },
      {
        type: 'Common External Contacts',
        description: 'External numbers contacted by multiple CDR holders',
        nodes: commonContacts,
        severity: 'medium' as const
      }
    ];

    console.log('=== REAL CDR Analysis completed successfully ===');
    console.log('Internal network:', internalNetwork.nodes.length, 'nodes,', internalNetwork.edges.length, 'edges');
    console.log('Full network:', fullNetwork.nodes.length, 'nodes,', fullNetwork.edges.length, 'edges');
    console.log('Role distribution:', {
      kingpins: fullStats.kingpins,
      middlemen: fullStats.middlemen,
      peddlers: fullStats.peddlers,
      external: fullStats.externalContacts
    });

    return {
      internalNetwork,
      fullNetwork,
      commonContacts,
      suspiciousPatterns
    };

  } catch (error) {
    console.error('=== CDR Network analysis failed ===');
    console.error('Error details:', error);
    throw new Error(`Failed to analyze CDR network: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
