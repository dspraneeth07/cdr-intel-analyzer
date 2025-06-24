
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

export const processCDRData = (rawData: any[], fileName: string): ProcessedCDRData => {
  console.log('Processing CDR data:', { fileName, totalRows: rawData.length });
  console.log('First 5 rows sample:', rawData.slice(0, 5));
  
  // Extract MSISDN from the header rows
  const msisdn = extractMSISDN(rawData);
  console.log('Extracted MSISDN:', msisdn);
  
  // Find where actual data starts
  const dataStartIndex = findDataStartIndex(rawData);
  console.log('Data starts at index:', dataStartIndex);
  
  // Get the header row (row before data starts)
  const headerRow = rawData[dataStartIndex - 1];
  console.log('Header row:', headerRow);
  
  // Extract column names from header
  const columnNames = headerRow ? Object.keys(headerRow) : [];
  console.log('Column names found:', columnNames);
  
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

  // Generate all sheets
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

const getFieldValue = (row: any, fieldNames: string[]): string => {
  for (const fieldName of fieldNames) {
    if (row[fieldName] !== undefined && row[fieldName] !== null) {
      return row[fieldName].toString();
    }
  }
  return '';
};

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
      DUR: 0,
      'FIRST CALL': '',
      'LAST CALL': '',
      STATE: '',
      ADDRESS: ''
    }];
  }

  const inCalls = data.filter(row => 
    getFieldValue(row, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('incoming')
  ).length;
  
  const outCalls = data.filter(row => 
    getFieldValue(row, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('outgoing')
  ).length;
  
  const inSMS = data.filter(row => 
    getFieldValue(row, ['Service Type'])?.toLowerCase().includes('sms') && 
    getFieldValue(row, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('incoming')
  ).length;
  
  const outSMS = data.filter(row => 
    getFieldValue(row, ['Service Type'])?.toLowerCase().includes('sms') && 
    getFieldValue(row, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('outgoing')
  ).length;
  
  const totalDuration = data.reduce((sum, row) => 
    sum + parseCallDuration(getFieldValue(row, ['Call Duration'])), 0
  );
  
  const dates = data.map(row => getFieldValue(row, ['Call date'])).filter(Boolean).sort();
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
    DUR: totalDuration,
    'FIRST CALL': firstCall,
    'LAST CALL': lastCall,
    STATE: getFieldValue(data[0] || {}, ['Roaming Network/Circle']),
    ADDRESS: getFieldValue(data[0] || {}, ['First BTS Location'])
  }];
};

const generateCallDetails = (data: any[], msisdn: string) => {
  console.log('Generating call details for', data.length, 'records');
  
  return data.map(row => ({
    PHONE: msisdn,
    OTHER: getFieldValue(row, ['B PARTY NUMBER']),
    'NICK NAME': '',
    STARTTIME: `${getFieldValue(row, ['Call date'])} ${getFieldValue(row, ['Call Initiation Time'])}`,
    DUR: parseCallDuration(getFieldValue(row, ['Call Duration'])),
    TYPE: getFieldValue(row, ['CALL_TYPE', 'Call Type']),
    IMEI: getFieldValue(row, ['IMEI']),
    IMSI: getFieldValue(row, ['IMSI']),
    CELLID: getFieldValue(row, ['First Cell Global Id']),
    ROAM_NW: getFieldValue(row, ['Roaming Network/Circle']),
    'AREA DESCRIPTION': getFieldValue(row, ['First BTS Location']),
    'LAT-LONG-AZM': ''
  }));
};

const generateNightCallDetails = (data: any[], msisdn: string) => {
  const nightData = data.filter(row => 
    isNightTime(getFieldValue(row, ['Call Initiation Time']))
  );
  
  return nightData.map((row, index) => ({
    'SL.No.': index + 1,
    PHONE: msisdn,
    OTHER: getFieldValue(row, ['B PARTY NUMBER']),
    STARTTIME: `${getFieldValue(row, ['Call date'])} ${getFieldValue(row, ['Call Initiation Time'])}`,
    DUR: parseCallDuration(getFieldValue(row, ['Call Duration'])),
    TYPE: getFieldValue(row, ['CALL_TYPE', 'Call Type']),
    IMEI: getFieldValue(row, ['IMEI']),
    IMSI: getFieldValue(row, ['IMSI']),
    CELLID: getFieldValue(row, ['First Cell Global Id']),
    ROAM_NW: getFieldValue(row, ['Roaming Network/Circle']),
    'AREA DESCRIPTION': getFieldValue(row, ['First BTS Location']),
    LAT: '',
    LONG: '',
    AZM: ''
  }));
};

const generateDayCallDetails = (data: any[], msisdn: string) => {
  const dayData = data.filter(row => 
    !isNightTime(getFieldValue(row, ['Call Initiation Time']))
  );
  
  return dayData.map((row, index) => ({
    'SL.No.': index + 1,
    PHONE: msisdn,
    OTHER: getFieldValue(row, ['B PARTY NUMBER']),
    STARTTIME: `${getFieldValue(row, ['Call date'])} ${getFieldValue(row, ['Call Initiation Time'])}`,
    DUR: parseCallDuration(getFieldValue(row, ['Call Duration'])),
    TYPE: getFieldValue(row, ['CALL_TYPE', 'Call Type']),
    IMEI: getFieldValue(row, ['IMEI']),
    IMSI: getFieldValue(row, ['IMSI']),
    CELLID: getFieldValue(row, ['First Cell Global Id']),
    ROAM_NW: getFieldValue(row, ['Roaming Network/Circle']),
    'AREA DESCRIPTION': getFieldValue(row, ['First BTS Location']),
    LAT: '',
    LONG: '',
    AZM: ''
  }));
};

const generateIMEISummary = (data: any[], msisdn: string) => {
  const imeiGroups = data.reduce((groups: any, row) => {
    const imei = getFieldValue(row, ['IMEI']) || 'Unknown';
    if (!groups[imei]) {
      groups[imei] = [];
    }
    groups[imei].push(row);
    return groups;
  }, {});

  return Object.entries(imeiGroups).map(([imei, records]: [string, any], index) => {
    const inCalls = records.filter((r: any) => 
      getFieldValue(r, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('incoming')
    ).length;
    const outCalls = records.filter((r: any) => 
      getFieldValue(r, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('outgoing')
    ).length;
    const totalDuration = records.reduce((sum: number, r: any) => 
      sum + parseCallDuration(getFieldValue(r, ['Call Duration'])), 0
    );
    
    const dates = records.map((r: any) => getFieldValue(r, ['Call date'])).filter(Boolean).sort();
    const firstCall = dates[0] || '';
    const lastCall = dates[dates.length - 1] || '';
    
    return {
      'SL.No.': index + 1,
      PHONE: msisdn,
      IMEINUMBER: imei,
      TOT_CALLS: records.length,
      IN: inCalls,
      OUT: outCalls,
      TOT_DUR: totalDuration,
      'FIRST CALL': firstCall,
      'LAST CALL': lastCall,
      SIM_USED_DAYS: '',
      NAME: '',
      ADDRESS: getFieldValue(records[0], ['First BTS Location']),
      ACT_DATE: '',
      LAST_UPDATED: ''
    };
  });
};

const generateCDATContacts = (data: any[], msisdn: string) => {
  const contactGroups = data.reduce((groups: any, row) => {
    const other = getFieldValue(row, ['B PARTY NUMBER']) || 'Unknown';
    if (!groups[other]) {
      groups[other] = [];
    }
    groups[other].push(row);
    return groups;
  }, {});

  return Object.entries(contactGroups).map(([other, records]: [string, any], index) => {
    const inCalls = records.filter((r: any) => 
      getFieldValue(r, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('incoming')
    ).length;
    const outCalls = records.filter((r: any) => 
      getFieldValue(r, ['CALL_TYPE', 'Call Type'])?.toLowerCase().includes('outgoing')
    ).length;
    const totalDuration = records.reduce((sum: number, r: any) => 
      sum + parseCallDuration(getFieldValue(r, ['Call Duration'])), 0
    );
    
    const dates = records.map((r: any) => getFieldValue(r, ['Call date'])).filter(Boolean).sort();
    const firstCall = dates[0] || '';
    const lastCall = dates[dates.length - 1] || '';
    
    return {
      'SL.No.': index + 1,
      PHONE: msisdn,
      OTHER: other,
      IN: inCalls,
      OUT: outCalls,
      TOT_CALLS: records.length,
      TOT_DUR: totalDuration,
      'FIRST CALL': firstCall,
      'LAST CALL': lastCall,
      STATE: getFieldValue(records[0], ['Roaming Network/Circle']),
      ADDRESS: getFieldValue(records[0], ['First BTS Location'])
    };
  });
};

const generateDayLocationAbstract = (data: any[], msisdn: string) => {
  const dayData = data.filter(row => 
    !isNightTime(getFieldValue(row, ['Call Initiation Time']))
  );
  const locationGroups = dayData.reduce((groups: any, row) => {
    const cellId = getFieldValue(row, ['First Cell Global Id']) || 'Unknown';
    if (!groups[cellId]) {
      groups[cellId] = [];
    }
    groups[cellId].push(row);
    return groups;
  }, {});

  return Object.entries(locationGroups).map(([cellId, records]: [string, any]) => ({
    PHONE: msisdn,
    DAYS: new Set(records.map((r: any) => getFieldValue(r, ['Call date']))).size,
    CELLTOWERID: cellId,
    CALLS: records.length,
    SITEADDRESS: getFieldValue(records[0], ['First BTS Location']),
    LAT: '',
    LONG: '',
    AZIMUTH: ''
  }));
};

const generateNightLocationAbstract = (data: any[], msisdn: string) => {
  const nightData = data.filter(row => 
    isNightTime(getFieldValue(row, ['Call Initiation Time']))
  );
  const locationGroups = nightData.reduce((groups: any, row) => {
    const cellId = getFieldValue(row, ['First Cell Global Id']) || 'Unknown';
    if (!groups[cellId]) {
      groups[cellId] = [];
    }
    groups[cellId].push(row);
    return groups;
  }, {});

  return Object.entries(locationGroups).map(([cellId, records]: [string, any]) => ({
    PHONE: msisdn,
    DAYS: new Set(records.map((r: any) => getFieldValue(r, ['Call date']))).size,  
    CELLTOWERID: cellId,
    CALLS: records.length,
    SITEADDRESS: getFieldValue(records[0], ['First BTS Location']),
    LAT: '',
    LONG: '',
    AZIMUTH: ''
  }));
};
