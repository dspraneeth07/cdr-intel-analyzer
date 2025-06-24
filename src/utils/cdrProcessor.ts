
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
  // Look for MSISDN in the header rows (first 10 rows)
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && typeof row === 'object') {
      // Check various possible keys for MSISDN
      for (const key in row) {
        if (key && row[key] && typeof row[key] === 'string') {
          const value = row[key].toString();
          // Look for MSISDN pattern in the value
          if (value.includes('MSISDN') && value.includes('-')) {
            const match = value.match(/MSISDN\s*:\s*-?\s*(\d+)/);
            if (match) return match[1];
          }
          // Direct number match
          if (key.includes('MSISDN') || key.includes('TARGET') || key.includes('A PARTY')) {
            const numberMatch = value.match(/\d{10,}/);
            if (numberMatch) return numberMatch[0];
          }
        }
      }
    }
  }
  
  // Fallback: look in actual data rows
  for (let i = 10; i < data.length; i++) {
    const row = data[i];
    if (row && row['Target /A PARTY NUMBER']) {
      const number = row['Target /A PARTY NUMBER'].toString();
      if (number.match(/^\d{10,}$/)) {
        return number;
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

export const processCDRData = (rawData: any[], fileName: string): ProcessedCDRData => {
  console.log('Processing CDR data:', { fileName, totalRows: rawData.length });
  
  // Extract MSISDN from the header rows
  const msisdn = extractMSISDN(rawData);
  console.log('Extracted MSISDN:', msisdn);
  
  // Skip header rows and find actual data starting from row 10 onwards
  const dataStartIndex = Math.max(10, rawData.findIndex(row => 
    row && 
    row['Target /A PARTY NUMBER'] && 
    row['Target /A PARTY NUMBER'] !== 'Target /A PARTY NUMBER' &&
    row['Target /A PARTY NUMBER'].toString().match(/^\d+$/)
  ));
  
  console.log('Data starts at index:', dataStartIndex);
  
  // Filter valid data rows
  const validData = rawData.slice(dataStartIndex).filter(row => 
    row && 
    row['Target /A PARTY NUMBER'] && 
    row['Target /A PARTY NUMBER'] !== 'Target /A PARTY NUMBER' &&
    row['Target /A PARTY NUMBER'].toString().match(/^\d+$/) &&
    row['Call date'] // Make sure we have a call date
  );

  console.log('Valid data rows found:', validData.length);
  console.log('Sample row:', validData[0]);

  // Generate all sheets
  const summary = generateSummary(validData, msisdn);
  const callDetails = generateCallDetails(validData, msisdn);
  const nightCallDetails = generateNightCallDetails(validData, msisdn);
  const dayCallDetails = generateDayCallDetails(validData, msisdn);
  const imeiSummary = generateIMEISummary(validData, msisdn);
  const cdatContacts = generateCDATContacts(validData, msisdn);
  const dayLocationAbstract = generateDayLocationAbstract(validData, msisdn);
  const nightLocationAbstract = generateNightLocationAbstract(validData, msisdn);

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

const generateSummary = (data: any[], msisdn: string) => {
  const inCalls = data.filter(row => row['CALL_TYPE']?.toLowerCase().includes('incoming')).length;
  const outCalls = data.filter(row => row['CALL_TYPE']?.toLowerCase().includes('outgoing')).length;
  const inSMS = data.filter(row => row['Service Type']?.toLowerCase().includes('sms') && row['CALL_TYPE']?.toLowerCase().includes('incoming')).length;
  const outSMS = data.filter(row => row['Service Type']?.toLowerCase().includes('sms') && row['CALL_TYPE']?.toLowerCase().includes('outgoing')).length;
  
  const totalDuration = data.reduce((sum, row) => sum + parseCallDuration(row['Call Duration']), 0);
  
  const dates = data.map(row => row['Call date']).filter(Boolean).sort();
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
    STATE: data[0]?.['Roaming Network/Circle'] || '',
    ADDRESS: data[0]?.['First BTS Location'] || ''
  }];
};

const generateCallDetails = (data: any[], msisdn: string) => {
  return data.map(row => ({
    PHONE: msisdn,
    OTHER: row['B PARTY NUMBER'] || '',
    'NICK NAME': '',
    STARTTIME: `${row['Call date']} ${row['Call Initiation Time']}`,
    DUR: parseCallDuration(row['Call Duration']),
    TYPE: row['CALL_TYPE'] || '',
    IMEI: row['IMEI'] || '',
    IMSI: row['IMSI'] || '',
    CELLID: row['First Cell Global Id'] || '',
    ROAM_NW: row['Roaming Network/Circle'] || '',
    'AREA DESCRIPTION': row['First BTS Location'] || '',
    'LAT-LONG-AZM': ''
  }));
};

const generateNightCallDetails = (data: any[], msisdn: string) => {
  const nightData = data.filter(row => isNightTime(row['Call Initiation Time']));
  
  return nightData.map((row, index) => ({
    'SL.No.': index + 1,
    PHONE: msisdn,
    OTHER: row['B PARTY NUMBER'] || '',
    STARTTIME: `${row['Call date']} ${row['Call Initiation Time']}`,
    DUR: parseCallDuration(row['Call Duration']),
    TYPE: row['CALL_TYPE'] || '',
    IMEI: row['IMEI'] || '',
    IMSI: row['IMSI'] || '',
    CELLID: row['First Cell Global Id'] || '',
    ROAM_NW: row['Roaming Network/Circle'] || '',
    'AREA DESCRIPTION': row['First BTS Location'] || '',
    LAT: '',
    LONG: '',
    AZM: ''
  }));
};

const generateDayCallDetails = (data: any[], msisdn: string) => {
  const dayData = data.filter(row => !isNightTime(row['Call Initiation Time']));
  
  return dayData.map((row, index) => ({
    'SL.No.': index + 1,
    PHONE: msisdn,
    OTHER: row['B PARTY NUMBER'] || '',
    STARTTIME: `${row['Call date']} ${row['Call Initiation Time']}`,
    DUR: parseCallDuration(row['Call Duration']),
    TYPE: row['CALL_TYPE'] || '',
    IMEI: row['IMEI'] || '',
    IMSI: row['IMSI'] || '',
    CELLID: row['First Cell Global Id'] || '',
    ROAM_NW: row['Roaming Network/Circle'] || '',
    'AREA DESCRIPTION': row['First BTS Location'] || '',
    LAT: '',
    LONG: '',
    AZM: ''
  }));
};

const generateIMEISummary = (data: any[], msisdn: string) => {
  const imeiGroups = data.reduce((groups: any, row) => {
    const imei = row['IMEI'] || 'Unknown';
    if (!groups[imei]) {
      groups[imei] = [];
    }
    groups[imei].push(row);
    return groups;
  }, {});

  return Object.entries(imeiGroups).map(([imei, records]: [string, any], index) => {
    const inCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase().includes('incoming')).length;
    const outCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase().includes('outgoing')).length;
    const totalDuration = records.reduce((sum: number, r: any) => sum + parseCallDuration(r['Call Duration']), 0);
    
    const dates = records.map((r: any) => r['Call date']).filter(Boolean).sort();
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
      ADDRESS: records[0]?.['First BTS Location'] || '',
      ACT_DATE: '',
      LAST_UPDATED: ''
    };
  });
};

const generateCDATContacts = (data: any[], msisdn: string) => {
  const contactGroups = data.reduce((groups: any, row) => {
    const other = row['B PARTY NUMBER'] || 'Unknown';
    if (!groups[other]) {
      groups[other] = [];
    }
    groups[other].push(row);
    return groups;
  }, {});

  return Object.entries(contactGroups).map(([other, records]: [string, any], index) => {
    const inCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase().includes('incoming')).length;
    const outCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase().includes('outgoing')).length;
    const totalDuration = records.reduce((sum: number, r: any) => sum + parseCallDuration(r['Call Duration']), 0);
    
    const dates = records.map((r: any) => r['Call date']).filter(Boolean).sort();
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
      STATE: records[0]?.['Roaming Network/Circle'] || '',
      ADDRESS: records[0]?.['First BTS Location'] || ''
    };
  });
};

const generateDayLocationAbstract = (data: any[], msisdn: string) => {
  const dayData = data.filter(row => !isNightTime(row['Call Initiation Time']));
  const locationGroups = dayData.reduce((groups: any, row) => {
    const cellId = row['First Cell Global Id'] || 'Unknown';
    if (!groups[cellId]) {
      groups[cellId] = [];
    }
    groups[cellId].push(row);
    return groups;
  }, {});

  return Object.entries(locationGroups).map(([cellId, records]: [string, any]) => ({
    PHONE: msisdn,
    DAYS: new Set(records.map((r: any) => r['Call date'])).size,
    CELLTOWERID: cellId,
    CALLS: records.length,
    SITEADDRESS: records[0]?.['First BTS Location'] || '',
    LAT: '',
    LONG: '',
    AZIMUTH: ''
  }));
};

const generateNightLocationAbstract = (data: any[], msisdn: string) => {
  const nightData = data.filter(row => isNightTime(row['Call Initiation Time']));
  const locationGroups = nightData.reduce((groups: any, row) => {
    const cellId = row['First Cell Global Id'] || 'Unknown';
    if (!groups[cellId]) {
      groups[cellId] = [];
    }
    groups[cellId].push(row);
    return groups;
  }, {});

  return Object.entries(locationGroups).map(([cellId, records]: [string, any]) => ({
    PHONE: msisdn,
    DAYS: new Set(records.map((r: any) => r['Call date'])).size,  
    CELLTOWERID: cellId,
    CALLS: records.length,
    SITEADDRESS: records[0]?.['First BTS Location'] || '',
    LAT: '',
    LONG: '',
    AZIMUTH: ''
  }));
};
