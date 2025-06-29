
export interface CDRRecord {
  msisdn: string;
  callType: string;
  connectionType: string;
  bPartyNumber: string;
  lrn: string;
  translation: string;
  callDate: string;
  callTime: string;
  duration: string;
  firstBTS: string;
  firstCellId: string;
  lastBTS: string;
  lastCellId: string;
  smsCenter: string;
  serviceType: string;
  imei: string;
  imsi: string;
  roamingNetwork: string;
  mscId: string;
}

export interface ProcessedCDRData {
  fileName: string;
  msisdn: string;
  summary: any[];
  callDetails: any[];
  nightCallDetails: any[];
  dayCallDetails: any[];
  imeiSummary: any[];
  cdatContacts: any[];
  dayLocationAbstract: any[];
  nightLocationAbstract: any[];
}

const isNightTime = (time: string): boolean => {
  if (!time) return false;
  const hour = parseInt(time.split(':')[0]);
  return hour >= 22 || hour <= 6;
};

const extractMSISDN = (data: any[]): string => {
  console.log('Looking for MSISDN in data:', data.slice(0, 15));
  
  // Look for MSISDN in the header rows (first 15 rows)
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (row && typeof row === 'object') {
      // Check all values in the row for MSISDN pattern
      for (const key in row) {
        const value = row[key];
        if (value && typeof value === 'string') {
          // Look for "MSISDN : - 9886788340" pattern
          if (value.includes('MSISDN') && value.includes('-')) {
            const match = value.match(/MSISDN\s*:\s*-\s*(\d+)/);
            if (match) {
              console.log('Found MSISDN in header:', match[1]);
              return match[1];
            }
          }
          // Look for standalone number that could be MSISDN
          if (value.match(/^\d{10}$/)) {
            console.log('Found potential MSISDN:', value);
            return value;
          }
        }
      }
    }
  }
  
  return 'Unknown';
};

const parseCallDuration = (duration: string): number => {
  if (!duration || duration === '-') return 0;
  const num = parseInt(duration.toString());
  return isNaN(num) ? 0 : num;
};

const findDataStartIndex = (data: any[]): number => {
  console.log('Finding data start index in', data.length, 'rows');
  
  // Look for the header row that contains "Target /A PARTY NUMBER"
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && typeof row === 'object') {
      // Check if this row contains the column headers
      for (const key in row) {
        if (key && key.includes('Target') && key.includes('PARTY')) {
          console.log('Found header row at index:', i);
          return i + 1; // Data starts after header row
        }
      }
    }
  }
  
  // Fallback: assume data starts at row 12
  console.log('Using fallback data start index: 12');
  return 12;
};

const getFieldValue = (row: any, index: number): string => {
  if (!row || !row.__parsed_extra) return '';
  if (index < 0 || index >= row.__parsed_extra.length) return '';
  const value = row.__parsed_extra[index];
  return value ? value.toString() : '';
};

const getFirstColumnValue = (row: any): string => {
  if (!row) return '';
  const keys = Object.keys(row);
  if (keys.length === 0) return '';
  const firstKey = keys[0];
  return row[firstKey] ? row[firstKey].toString() : '';
};

export const processCDRData = (rawData: any[], fileName: string): ProcessedCDRData => {
  console.log('Processing CDR data:', { fileName, totalRows: rawData.length });
  console.log('First 5 rows sample:', rawData.slice(0, 5));
  
  // Extract MSISDN from the header rows
  const msisdn = extractMSISDN(rawData);
  console.log('Extracted MSISDN:', msisdn);
  
  // Find where actual data starts
  const dataStartIndex = findDataStartIndex(rawData);
  console.log('Data starts at index:', dataStartIndex);
  
  // Filter valid data rows starting from dataStartIndex
  const validData = [];
  for (let i = dataStartIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && typeof row === 'object') {
      // Check if row has actual data (not empty or header)
      const hasData = Object.values(row).some(value => 
        value && 
        typeof value === 'string' && 
        value.trim() !== '' && 
        !value.includes('Target') &&
        !value.includes('PARTY')
      );
      
      if (hasData) {
        validData.push(row);
      }
    }
  }

  console.log('Valid data rows found:', validData.length);
  console.log('Sample valid row:', validData[0]);

  if (validData.length === 0) {
    console.warn('No valid data rows found, creating empty sheets');
  }

  // Generate all sheets with correct field mappings
  const summary = generateSummary(validData, msisdn);
  const callDetails = generateCallDetails(validData, msisdn);
  const nightCallDetails = generateNightCallDetails(validData, msisdn);
  const dayCallDetails = generateDayCallDetails(validData, msisdn);
  const imeiSummary = generateIMEISummary(validData, msisdn);
  const cdatContacts = generateCDATContacts(validData, msisdn);
  const dayLocationAbstract = generateDayLocationAbstract(validData, msisdn);
  const nightLocationAbstract = generateNightLocationAbstract(validData, msisdn);

  console.log('Generated summary:', summary);
  console.log('Generated call details count:', callDetails.length);

  return {
    fileName,
    msisdn,
    summary,
    callDetails,
    nightCallDetails,
    dayCallDetails,
    imeiSummary,
    cdatContacts,
    dayLocationAbstract,
    nightLocationAbstract
  };
};

// Table 1: Summary
const generateSummary = (data: any[], msisdn: string) => {
  console.log('Generating summary for', data.length, 'records');
  
  if (data.length === 0) {
    return [{
      PHONE: msisdn,
      OTHER: '',
      'IN CALLS': 0,
      'OUT CALLS': 0,
      'TOT CALLS': 0,
      'IN SMS': 0,
      'OUT SMS': 0,
      'TOT SMS': 0,
      'Call Duration': 0,
      'Call date': '',
      'Call date (Last)': '',
      'Roaming Network/Circle': '',
      'First BTS Location': ''
    }];
  }

  // Map indices based on CDR structure: [CALL_TYPE, ConnectionType, BParty, LRN, RoamingNetwork, Date, Time, Duration, FirstBTS, FirstCellId, LastBTS, LastCellId, SMSCenter, ServiceType, IMEI, IMSI, -, RoamingNetwork2, CallForwarding, -, -, -, -, -]
  const inCalls = data.filter(row => 
    getFieldValue(row, 0)?.toLowerCase().includes('incoming')
  ).length;
  
  const outCalls = data.filter(row => 
    getFieldValue(row, 0)?.toLowerCase().includes('outgoing')
  ).length;
  
  const inSMS = data.filter(row => 
    getFieldValue(row, 13)?.toLowerCase().includes('sms') && 
    getFieldValue(row, 0)?.toLowerCase().includes('incoming')
  ).length;
  
  const outSMS = data.filter(row => 
    getFieldValue(row, 13)?.toLowerCase().includes('sms') && 
    getFieldValue(row, 0)?.toLowerCase().includes('outgoing')
  ).length;
  
  const totalDuration = data.reduce((sum, row) => 
    sum + parseCallDuration(getFieldValue(row, 7)), 0
  );
  
  const dates = data.map(row => getFieldValue(row, 5)).filter(Boolean).sort();
  const firstCall = dates[0] || '';
  const lastCall = dates[dates.length - 1] || '';

  return [{
    PHONE: msisdn,
    OTHER: '',
    'IN CALLS': inCalls,
    'OUT CALLS': outCalls,
    'TOT CALLS': inCalls + outCalls,
    'IN SMS': inSMS,
    'OUT SMS': outSMS,
    'TOT SMS': inSMS + outSMS,
    'Call Duration': totalDuration,
    'Call date': firstCall,
    'Call date (Last)': lastCall,
    'Roaming Network/Circle': getFieldValue(data[0] || {}, 4),
    'First BTS Location': getFieldValue(data[0] || {}, 8)
  }];
};

// Table 2: Call Details
const generateCallDetails = (data: any[], msisdn: string) => {
  console.log('Generating call details for', data.length, 'records');
  
  return data.map(row => ({
    'Target /A PARTY NUMBER': getFirstColumnValue(row),
    'B PARTY NUMBER': getFieldValue(row, 2),
    'Translation of LRN': getFieldValue(row, 3),
    'Call Initiation Time': `${getFieldValue(row, 5)} ${getFieldValue(row, 6)}`,
    'Call Duration': parseCallDuration(getFieldValue(row, 7)),
    'Service Type': getFieldValue(row, 13),
    'IMEI': getFieldValue(row, 14),
    'IMSI': getFieldValue(row, 15),
    'First Cell Global Id': getFieldValue(row, 9),
    'Roaming Network/Circle': getFieldValue(row, 4),
    'First BTS Location': getFieldValue(row, 8)
  }));
};

// Table 3: Night Call Details
const generateNightCallDetails = (data: any[], msisdn: string) => {
  const nightData = data.filter(row => 
    isNightTime(getFieldValue(row, 6))
  );
  
  return nightData.map((row, index) => ({
    'SL.No.': index + 1,
    'Target /A PARTY NUMBER': getFirstColumnValue(row),
    'B PARTY NUMBER': getFieldValue(row, 2),
    'Call Initiation Time': `${getFieldValue(row, 5)} ${getFieldValue(row, 6)}`,
    'Call Duration': parseCallDuration(getFieldValue(row, 7)),
    'CALL_TYPE': getFieldValue(row, 0),
    'IMEI': getFieldValue(row, 14),
    'IMSI': getFieldValue(row, 15),
    'First Cell Global Id': getFieldValue(row, 9),
    'Roaming Network/Circle': getFieldValue(row, 4),
    'Last BTS Location': getFieldValue(row, 10)
  }));
};

// Table 4: Day Call Details
const generateDayCallDetails = (data: any[], msisdn: string) => {
  const dayData = data.filter(row => 
    !isNightTime(getFieldValue(row, 6))
  );
  
  return dayData.map((row, index) => ({
    'SL.No.': index + 1,
    'Target /A PARTY NUMBER': getFirstColumnValue(row),
    'B PARTY NUMBER': getFieldValue(row, 2),
    'Call Initiation Time': `${getFieldValue(row, 5)} ${getFieldValue(row, 6)}`,
    'Call Duration': parseCallDuration(getFieldValue(row, 7)),
    'CALL_TYPE': getFieldValue(row, 0),
    'IMEI': getFieldValue(row, 14),
    'IMSI': getFieldValue(row, 15),
    'Last Cell Global Id': getFieldValue(row, 11),
    'Roaming Network/Circle': getFieldValue(row, 4),
    'Last BTS Location': getFieldValue(row, 10)
  }));
};

// Table 5: IMEI Summary
const generateIMEISummary = (data: any[], msisdn: string) => {
  const imeiGroups = data.reduce((groups: any, row) => {
    const imei = getFieldValue(row, 14) || 'Unknown';
    if (!groups[imei]) {
      groups[imei] = [];
    }
    groups[imei].push(row);
    return groups;
  }, {});

  return Object.entries(imeiGroups).map(([imei, records]: [string, any], index) => {
    const inCalls = records.filter((r: any) => 
      getFieldValue(r, 0)?.toLowerCase().includes('incoming')
    ).length;
    const outCalls = records.filter((r: any) => 
      getFieldValue(r, 0)?.toLowerCase().includes('outgoing')
    ).length;
    const totalDuration = records.reduce((sum: number, r: any) => 
      sum + parseCallDuration(getFieldValue(r, 7)), 0
    );
    
    const dates = records.map((r: any) => getFieldValue(r, 5)).filter(Boolean).sort();
    const firstCall = dates[0] || '';
    const lastCall = dates[dates.length - 1] || '';
    
    return {
      'SL.No.': index + 1,
      'Target /A PARTY NUMBER': getFirstColumnValue(records[0]),
      'IMEI': imei,
      'TOT CALLS': records.length,
      'CALL_TYPE (IN)': inCalls,
      'CALL_TYPE (OUT)': outCalls,
      'Call Duration': totalDuration,
      'Call date (First)': firstCall,
      'Call date (Last)': lastCall,
      'Call Forwarding Number': getFieldValue(records[0], 18),
      'Translation of LRN': getFieldValue(records[0], 3),
      'First BTS Location': getFieldValue(records[0], 8)
    };
  });
};

// Table 6: CDAT Contacts
const generateCDATContacts = (data: any[], msisdn: string) => {
  const contactGroups = data.reduce((groups: any, row) => {
    const other = getFieldValue(row, 2) || 'Unknown';
    if (!groups[other]) {
      groups[other] = [];
    }
    groups[other].push(row);
    return groups;
  }, {});

  return Object.entries(contactGroups).map(([other, records]: [string, any], index) => {
    const inCalls = records.filter((r: any) => 
      getFieldValue(r, 0)?.toLowerCase().includes('incoming')
    ).length;
    const outCalls = records.filter((r: any) => 
      getFieldValue(r, 0)?.toLowerCase().includes('outgoing')
    ).length;
    const totalDuration = records.reduce((sum: number, r: any) => 
      sum + parseCallDuration(getFieldValue(r, 7)), 0
    );
    
    const dates = records.map((r: any) => getFieldValue(r, 5)).filter(Boolean).sort();
    const firstCall = dates[0] || '';
    const lastCall = dates[dates.length - 1] || '';
    
    return {
      'SL.No.': index + 1,
      'Target /A PARTY NUMBER': getFirstColumnValue(records[0]),
      'B PARTY NUMBER': other,
      'CALL_TYPE (IN)': inCalls,
      'CALL_TYPE (OUT)': outCalls,
      'TOT CALLS': records.length,
      'Call Duration': totalDuration,
      'Call date (First)': firstCall,
      'Call date (Last)': lastCall,
      'Roaming Network/Circle': getFieldValue(records[0], 4),
      'First BTS Location': getFieldValue(records[0], 8)
    };
  });
};

// Table 7: Day Location Abstract
const generateDayLocationAbstract = (data: any[], msisdn: string) => {
  const dayData = data.filter(row => 
    !isNightTime(getFieldValue(row, 6))
  );
  const locationGroups = dayData.reduce((groups: any, row) => {
    const cellId = getFieldValue(row, 9) || 'Unknown';
    if (!groups[cellId]) {
      groups[cellId] = [];
    }
    groups[cellId].push(row);
    return groups;
  }, {});

  return Object.entries(locationGroups).map(([cellId, records]: [string, any]) => ({
    'Target /A PARTY NUMBER': getFirstColumnValue(records[0]),
    'Call date': new Set(records.map((r: any) => getFieldValue(r, 5))).size,
    'First Cell Global Id': cellId,
    'CALL_TYPE': records.length,
    'First BTS Location': getFieldValue(records[0], 8),
    'LAT': '',
    'LONG': '',
    'AZIMUTH': ''
  }));
};

// Table 8: Night Location Abstract
const generateNightLocationAbstract = (data: any[], msisdn: string) => {
  const nightData = data.filter(row => 
    isNightTime(getFieldValue(row, 6))
  );
  const locationGroups = nightData.reduce((groups: any, row) => {
    const cellId = getFieldValue(row, 11) || 'Unknown';
    if (!groups[cellId]) {
      groups[cellId] = [];
    }
    groups[cellId].push(row);
    return groups;
  }, {});

  return Object.entries(locationGroups).map(([cellId, records]: [string, any]) => ({
    'Target /A PARTY NUMBER': getFirstColumnValue(records[0]),
    'Call date': new Set(records.map((r: any) => getFieldValue(r, 5))).size,
    'Last Cell Global Id': cellId,
    'CALL_TYPE': records.length,
    'Last BTS Location': getFieldValue(records[0], 10),
    'LAT': '',
    'LONG': '',
    'AZIMUTH': ''
  }));
};
