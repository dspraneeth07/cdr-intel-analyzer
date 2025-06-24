
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
  // Extract MSISDN from the first data row or header
  for (const row of data) {
    if (row['Target /A PARTY NUMBER'] || row['MSISDN']) {
      return row['Target /A PARTY NUMBER'] || row['MSISDN'];
    }
  }
  return 'Unknown';
};

const parseCallDuration = (duration: string): number => {
  if (!duration || duration === '-') return 0;
  const num = parseInt(duration);
  return isNaN(num) ? 0 : num;
};

export const processCDRData = (rawData: any[], fileName: string): ProcessedCDRData => {
  console.log('Processing CDR data:', { fileName, rowCount: rawData.length });
  
  // Extract MSISDN from the data
  const msisdn = extractMSISDN(rawData);
  
  // Filter out header rows and empty rows
  const validData = rawData.filter(row => 
    row['Target /A PARTY NUMBER'] && 
    row['Target /A PARTY NUMBER'] !== 'Target /A PARTY NUMBER' &&
    row['Target /A PARTY NUMBER'].match(/^\d+$/)
  );

  console.log('Valid data rows:', validData.length);

  // Sheet 1: Summary
  const summary = generateSummary(validData, msisdn);
  
  // Sheet 2: Call Details  
  const callDetails = generateCallDetails(validData, msisdn);
  
  // Sheet 3: Night Call Details
  const nightCallDetails = generateNightCallDetails(validData, msisdn);
  
  // Sheet 4: Day Call Details
  const dayCallDetails = generateDayCallDetails(validData, msisdn);
  
  // Sheet 5: IMEI Summary
  const imeiSummary = generateIMEISummary(validData, msisdn);
  
  // Sheet 6: CDAT Contacts
  const cdatContacts = generateCDATContacts(validData, msisdn);
  
  // Sheet 7: Day Location Abstract
  const dayLocationAbstract = generateDayLocationAbstract(validData, msisdn);
  
  // Sheet 8: Night Location Abstract
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
  const inCalls = data.filter(row => row['CALL_TYPE']?.toLowerCase() === 'incoming').length;
  const outCalls = data.filter(row => row['CALL_TYPE']?.toLowerCase() === 'outgoing').length;
  const inSMS = data.filter(row => row['Service Type']?.toLowerCase() === 'sms' && row['CALL_TYPE']?.toLowerCase() === 'incoming').length;
  const outSMS = data.filter(row => row['Service Type']?.toLowerCase() === 'sms' && row['CALL_TYPE']?.toLowerCase() === 'outgoing').length;
  
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
    const inCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase() === 'incoming').length;
    const outCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase() === 'outgoing').length;
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
    const inCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase() === 'incoming').length;
    const outCalls = records.filter((r: any) => r['CALL_TYPE']?.toLowerCase() === 'outgoing').length;
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
