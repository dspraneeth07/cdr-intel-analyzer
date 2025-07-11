export interface CDRRecord {
  cdrNo: string;
  bParty: string;
  date: string;
  time: string;
  duration: string;
  callType: string;
  firstCellId: string;
  firstCellAddress: string;
  lastCellId: string;
  lastCellAddress: string;
  imei: string;
  imsi: string;
  roaming: string;
  circle: string;
  operator: string;
  lrn: string;
  callForward: string;
  serviceType: string;
}

export interface ProcessedCDRData {
  fileName: string;
  msisdn: string;
  provider: string;
  mapping: any[];
  summary: any[];
  maxCalls: any[];
  maxDuration: any[];
  maxStay: any[];
  otherStateContactSummary: any[];
  roamingPeriod: any[];
  imeiPeriod: any[];
  imsiPeriod: any[];
  offUnusedPeriod: any[];
  nightMapping: any[];
  nightMaxStay: any[];
  dayMapping: any[];
  dayMaxStay: any[];
  workHomeLocation: any[];
  homeLocationBasedOnDayFirst: any[];
}

// Provider detection and configuration
const PROVIDER_CONFIGS = {
  AIRTEL: {
    identifiers: ['BHARTI AIRTEL LIMITED', 'Call Details of Mobile No', 'Call Details of IMEI No'],
    dataStartRow: 7,
    msisdnPattern: /Call Details of Mobile No '(\d+)'/i,
    imeiPattern: /Call Details of IMEI No '(\d+)'/i
  },
  BSNL: {
    identifiers: ['Search Criteria : MSISDN', 'Search Value :'],
    dataStartRow: 7,
    msisdnPattern: /Search Value\s*:\s*(\d+)/i,
    imeiPattern: /IMEI.*?(\d{15})/i
  },
  JIO: {
    identifiers: ['Ticket Number :', 'Input Value (MSISDN/B PARTY/IMEI/IMSI/CELL ID)'],
    dataStartRow: { mobile: 19, imei: 11 },
    msisdnPattern: /Input Value.*?'(\d+)'/i,
    imeiPattern: /Input Value.*?'(\d{15})'/i
  },
  VODAFONE: {
    identifiers: ['Vodafone Idea Call Data Records', 'MSISDN : -', 'IMEI : -'],
    dataStartRow: 12,
    msisdnPattern: /MSISDN\s*:\s*-\s*(\d+)/i,
    imeiPattern: /IMEI\s*:\s*-\s*(\d+)/i
  }
};

const detectProvider = (data: any[]): { provider: string; config: any } => {
  console.log('Detecting provider from data...');
  
  // Convert first 20 rows to searchable text
  const searchText = data.slice(0, 20).map(row => {
    if (!row) return '';
    
    // Handle different row structures
    if (typeof row === 'object') {
      return Object.values(row).filter(val => val !== null && val !== undefined).join(' ');
    }
    return row.toString();
  }).join(' ').toUpperCase();

  console.log('Search text sample:', searchText.substring(0, 500));

  for (const [provider, config] of Object.entries(PROVIDER_CONFIGS)) {
    const found = config.identifiers.some(id => {
      const match = searchText.includes(id.toUpperCase());
      if (match) {
        console.log(`Found ${provider} identifier: ${id}`);
      }
      return match;
    });
    
    if (found) {
      console.log(`Detected provider: ${provider}`);
      return { provider, config };
    }
  }
  
  console.log('No provider detected, defaulting to VODAFONE');
  return { provider: 'VODAFONE', config: PROVIDER_CONFIGS.VODAFONE };
};

const extractMSISDN = (data: any[], config: any, provider: string): string => {
  console.log('Extracting CDR number with config:', config, 'Provider:', provider);
  
  // Search through first 25 rows for CDR number
  for (let i = 0; i < Math.min(25, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    // Convert row to searchable text
    let searchText = '';
    if (typeof row === 'object') {
      searchText = Object.values(row).filter(val => val !== null && val !== undefined).join(' ');
    } else {
      searchText = row.toString();
    }
    
    if (!searchText || searchText.trim() === '') continue;
    
    console.log(`Row ${i} text:`, searchText.substring(0, 200));
    
    // Try IMEI pattern first (usually longer numbers)
    if (config.imeiPattern) {
      const imeiMatch = searchText.match(config.imeiPattern);
      if (imeiMatch && imeiMatch[1]) {
        console.log('Found IMEI as CDR:', imeiMatch[1]);
        return imeiMatch[1];
      }
    }
    
    // Then try MSISDN pattern
    if (config.msisdnPattern) {
      const msisdnMatch = searchText.match(config.msisdnPattern);
      if (msisdnMatch && msisdnMatch[1]) {
        console.log('Found MSISDN as CDR:', msisdnMatch[1]);
        return msisdnMatch[1];
      }
    }
    
    // Additional fallback patterns for each provider
    if (provider === 'AIRTEL') {
      const airtelFallback = searchText.match(/Mobile No[^']*'(\d+)'/i) || 
                            searchText.match(/IMEI No[^']*'(\d+)'/i);
      if (airtelFallback && airtelFallback[1]) {
        console.log('Found Airtel CDR (fallback):', airtelFallback[1]);
        return airtelFallback[1];
      }
    } else if (provider === 'BSNL') {
      const bsnlFallback = searchText.match(/Search Value[^:]*:\s*(\d+)/i);
      if (bsnlFallback && bsnlFallback[1]) {
        console.log('Found BSNL CDR (fallback):', bsnlFallback[1]);
        return bsnlFallback[1];
      }
    } else if (provider === 'JIO') {
      const jioFallback = searchText.match(/Input Value[^']*'(\d+)'/i);
      if (jioFallback && jioFallback[1]) {
        console.log('Found JIO CDR (fallback):', jioFallback[1]);
        return jioFallback[1];
      }
    } else if (provider === 'VODAFONE') {
      const vodafoneFallback = searchText.match(/MSISDN[^:]*:[^-]*-\s*(\d+)/i) ||
                              searchText.match(/IMEI[^:]*:[^-]*-\s*(\d+)/i);
      if (vodafoneFallback && vodafoneFallback[1]) {
        console.log('Found Vodafone CDR (fallback):', vodafoneFallback[1]);
        return vodafoneFallback[1];
      }
    }
  }
  
  console.log('CDR number not found, returning Unknown');
  return 'Unknown';
};

const getDataStartIndex = (provider: string, config: any, isImei: boolean = false): number => {
  if (provider === 'JIO') {
    return isImei ? config.dataStartRow.imei : config.dataStartRow.mobile;
  }
  return config.dataStartRow;
};

const parseCallDuration = (duration: string): number => {
  if (!duration || duration === '-' || duration === '') return 0;
  const num = parseInt(duration.toString());
  return isNaN(num) ? 0 : num;
};

const isNightTime = (time: string): boolean => {
  if (!time) return false;
  const hour = parseInt(time.split(':')[0]);
  // Night time: 18:00:00 to 06:00:00 (6 PM to 6 AM)
  return hour >= 18 || hour < 6;
};

const isRoaming = (location: string, circle: string): boolean => {
  if (!location && !circle) return false;
  const locationStr = (location || '').toLowerCase();
  const circleStr = (circle || '').toLowerCase();
  
  // Check if location/circle is outside Telangana
  return !locationStr.includes('telangana') && 
         !locationStr.includes('hyderabad') && 
         !locationStr.includes('ts') &&
         !circleStr.includes('telangana') && 
         !circleStr.includes('hyderabad');
};

const getFieldValue = (row: any, index: number): string => {
  if (!row) return '';
  
  // Handle different row structures
  if (row.__parsed_extra && row.__parsed_extra[index]) {
    return row.__parsed_extra[index].toString();
  }
  
  const keys = Object.keys(row);
  if (index < keys.length) {
    return row[keys[index]] ? row[keys[index]].toString() : '';
  }
  
  return '';
};

const mapProviderFields = (row: any, provider: string) => {
  const fieldMappings = {
    AIRTEL: {
      targetNo: 0, callType: 1, toc: 2, bParty: 3, lrn: 4, lrnTsp: 5,
      date: 6, time: 7, duration: 8, firstCgiLatLong: 9, firstCgi: 10,
      lastCgiLatLong: 11, lastCgi: 12, smsc: 13, serviceType: 14,
      imei: 15, imsi: 16, callForward: 17, roaming: 18, mscId: 19
    },
    BSNL: {
      slNo: 0, mobileNo: 1, callType: 2, toc: 3, otherParty: 4, lrnBParty: 5,
      lrnDesc: 6, callDate: 7, callTime: 8, duration: 9, firstCellDesc: 10,
      firstCellId: 11, lastCellDesc: 12, lastCellId: 13, smsc: 14,
      serviceType: 15, imei: 16, imsi: 17, originalParty: 18, circle: 19, mscId: 20
    },
    JIO: {
      callingParty: 0, calledParty: 1, callForwarding: 2, lrnCalled: 3,
      callDate: 4, callTime: 5, callTermTime: 6, duration: 7, firstCellId: 8,
      lastCellId: 9, callType: 10, smsCenter: 11, imei: 12, imsi: 13, roamingCircle: 14
    },
    VODAFONE: {
      targetNo: 0, callType: 1, toc: 2, bParty: 3, lrnBParty: 4, lrnTranslation: 5,
      callDate: 6, callTime: 7, duration: 8, firstBts: 9, firstCellGlobal: 10,
      lastBts: 11, lastCellGlobal: 12, smsCentre: 13, serviceType: 14,
      imei: 15, imsi: 16, callForward: 17, roaming: 18, mscId: 19
    }
  };

  const mapping = fieldMappings[provider] || fieldMappings.VODAFONE;
  
  return {
    targetNo: getFieldValue(row, mapping.targetNo || 0),
    callType: getFieldValue(row, mapping.callType || 1),
    bParty: getFieldValue(row, mapping.bParty || 3),
    date: getFieldValue(row, mapping.callDate || mapping.date || 6),
    time: getFieldValue(row, mapping.callTime || mapping.time || 7),
    duration: getFieldValue(row, mapping.duration || 8),
    firstCellId: getFieldValue(row, mapping.firstCellId || mapping.firstCgi || mapping.firstCellGlobal || 10),
    lastCellId: getFieldValue(row, mapping.lastCellId || mapping.lastCgi || mapping.lastCellGlobal || 12),
    imei: getFieldValue(row, mapping.imei || 15),
    imsi: getFieldValue(row, mapping.imsi || 16),
    roaming: getFieldValue(row, mapping.roaming || mapping.roamingCircle || 18),
    lrn: getFieldValue(row, mapping.lrn || mapping.lrnBParty || 4),
    callForward: getFieldValue(row, mapping.callForward || mapping.callForwarding || 17),
    serviceType: getFieldValue(row, mapping.serviceType || 14),
    firstBts: getFieldValue(row, mapping.firstBts || mapping.firstCellDesc || 9),
    lastBts: getFieldValue(row, mapping.lastBts || mapping.lastCellDesc || 11)
  };
};

export const processCDRData = (rawData: any[], fileName: string): ProcessedCDRData => {
  console.log('Processing CDR data:', { fileName, totalRows: rawData.length });
  
  const { provider, config } = detectProvider(rawData);
  console.log('Final detected provider:', provider);
  
  const msisdn = extractMSISDN(rawData, config, provider);
  console.log('Final extracted CDR:', msisdn);
  
  const isImeiData = fileName.toLowerCase().includes('imei') || 
                     rawData.some(row => Object.values(row || {}).join(' ').toLowerCase().includes('imei'));
  
  const dataStartIndex = getDataStartIndex(provider, config, isImeiData);
  console.log('Data starts at index:', dataStartIndex);
  
  // Filter valid data rows
  const validData = [];
  for (let i = dataStartIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && typeof row === 'object') {
      const hasData = Object.values(row).some(value => 
        value && 
        typeof value === 'string' && 
        value.trim() !== '' && 
        !value.includes('Target') &&
        !value.includes('PARTY') &&
        !value.includes('Call Type')
      );
      
      if (hasData) {
        validData.push(row);
      }
    }
  }

  console.log('Valid data rows found:', validData.length);

  // Generate all 16 sheets
  const processedData = {
    fileName,
    msisdn,
    provider,
    mapping: generateMapping(validData, provider, msisdn),
    summary: generateSummary(validData, provider, msisdn),
    maxCalls: generateMaxCalls(validData, provider, msisdn),
    maxDuration: generateMaxDuration(validData, provider, msisdn),
    maxStay: generateMaxStay(validData, provider, msisdn),
    otherStateContactSummary: generateOtherStateContactSummary(validData, provider, msisdn),
    roamingPeriod: generateRoamingPeriod(validData, provider, msisdn),
    imeiPeriod: generateImeiPeriod(validData, provider, msisdn),
    imsiPeriod: generateImsiPeriod(validData, provider, msisdn),
    offUnusedPeriod: generateOffUnusedPeriod(validData, provider, msisdn),
    nightMapping: generateNightMapping(validData, provider, msisdn),
    nightMaxStay: generateNightMaxStay(validData, provider, msisdn),
    dayMapping: generateDayMapping(validData, provider, msisdn),
    dayMaxStay: generateDayMaxStay(validData, provider, msisdn),
    workHomeLocation: generateWorkHomeLocation(validData, provider, msisdn),
    homeLocationBasedOnDayFirst: generateHomeLocationBasedOnDayFirst(validData, provider, msisdn)
  };

  return processedData;
};

// Sheet 1: MAPPING
const generateMapping = (data: any[], provider: string, msisdn: string) => {
  return data.map((row, index) => {
    const mapped = mapProviderFields(row, provider);
    return {
      CdrNo: msisdn,
      'B Party': mapped.bParty,
      Date: mapped.date,
      Time: mapped.time,
      Duration: parseCallDuration(mapped.duration),
      'Call Type': mapped.callType,
      'First Cell ID': mapped.firstCellId,
      'First Cell ID Address': mapped.firstBts || '',
      'Last Cell ID': mapped.lastCellId,
      'Last Cell ID Address': mapped.lastBts || '',
      IMEI: mapped.imei,
      IMSI: mapped.imsi,
      Roaming: mapped.roaming,
      'Main City(First CellID)': '',
      'Sub City(First CellID)': '',
      'Lat-Long-Azimuth (First CellID)': '',
      Crime: '',
      Circle: mapped.roaming,
      Operator: provider,
      NumTmp: mapped.targetNo,
      LRN: mapped.lrn,
      CallForward: mapped.callForward,
      RoamingOriginated: mapped.roaming,
      'B Party Provider': '',
      'B Party Circle': '',
      'B Party Operator': '',
      Type: mapped.serviceType,
      'IMEI Manufacturer': '',
      'Device Type': '',
      Location: mapped.firstBts || '',
      RoamGroup: '',
      ImeiGroup: '',
      ImsiGroup: '',
      TimeHH: mapped.time ? mapped.time.split(':')[0] : ''
    };
  });
};

// Sheet 2: SUMMARY
const generateSummary = (data: any[], provider: string, msisdn: string) => {
  const contacts = {};
  
  data.forEach(row => {
    const mapped = mapProviderFields(row, provider);
    const bParty = mapped.bParty;
    
    if (!contacts[bParty]) {
      contacts[bParty] = {
        totalCalls: 0,
        outCalls: 0,
        inCalls: 0,
        outSms: 0,
        inSms: 0,
        totalDuration: 0,
        dates: new Set(),
        cellIds: new Set(),
        imeis: new Set(),
        imsis: new Set(),
        firstCall: null,
        lastCall: null
      };
    }
    
    const contact = contacts[bParty];
    contact.totalCalls++;
    
    if (mapped.callType?.toLowerCase().includes('out')) {
      contact.outCalls++;
    } else if (mapped.callType?.toLowerCase().includes('in')) {
      contact.inCalls++;
    }
    
    if (mapped.serviceType?.toLowerCase().includes('sms')) {
      if (mapped.callType?.toLowerCase().includes('out')) {
        contact.outSms++;
      } else if (mapped.callType?.toLowerCase().includes('in')) {
        contact.inSms++;
      }
    }
    
    contact.totalDuration += parseCallDuration(mapped.duration);
    contact.dates.add(mapped.date);
    contact.cellIds.add(mapped.firstCellId);
    contact.imeis.add(mapped.imei);
    contact.imsis.add(mapped.imsi);
    
    const callDateTime = `${mapped.date} ${mapped.time}`;
    if (!contact.firstCall || callDateTime < contact.firstCall) {
      contact.firstCall = callDateTime;
    }
    if (!contact.lastCall || callDateTime > contact.lastCall) {
      contact.lastCall = callDateTime;
    }
  });
  
  return Object.entries(contacts).map(([bParty, contact]: [string, any]) => ({
    CdrNo: msisdn,
    'B Party': bParty,
    SDR: '',
    Nickname: '',
    Provider: provider,
    Type: '',
    'Total Calls': contact.totalCalls,
    'Out Calls': contact.outCalls,
    'In Calls': contact.inCalls,
    'Out Sms': contact.outSms,
    'In Sms': contact.inSms,
    'Other Calls': contact.totalCalls - contact.outCalls - contact.inCalls,
    'Total Duration': contact.totalDuration,
    'Total Days': contact.dates.size,
    'Total CellIds': contact.cellIds.size,
    'Total Imei': contact.imeis.size,
    'Total Imsi': contact.imsis.size,
    'First Call Date': contact.firstCall?.split(' ')[0] || '',
    'First Call Time': contact.firstCall?.split(' ')[1] || '',
    'Last Call Date': contact.lastCall?.split(' ')[0] || '',
    'Last Call Time': contact.lastCall?.split(' ')[1] || ''
  }));
};

// Sheet 3: MAX CALLS
const generateMaxCalls = (data: any[], provider: string, msisdn: string) => {
  const contacts: { [key: string]: number } = {};
  
  data.forEach(row => {
    const mapped = mapProviderFields(row, provider);
    const bParty = mapped.bParty;
    contacts[bParty] = (contacts[bParty] || 0) + 1;
  });
  
  return Object.entries(contacts)
    .sort(([,a], [,b]) => (Number(b) || 0) - (Number(a) || 0))
    .map(([bParty, calls]) => ({
      CdrNo: msisdn,
      'B Party': bParty,
      'Total Calls': calls,
      Provider: provider
    }));
};

// Sheet 4: MAX DURATION
const generateMaxDuration = (data: any[], provider: string, msisdn: string) => {
  const contacts: { [key: string]: number } = {};
  
  data.forEach(row => {
    const mapped = mapProviderFields(row, provider);
    const bParty = mapped.bParty;
    contacts[bParty] = (contacts[bParty] || 0) + parseCallDuration(mapped.duration);
  });
  
  return Object.entries(contacts)
    .sort(([,a], [,b]) => (Number(b) || 0) - (Number(a) || 0))
    .map(([bParty, duration]) => ({
      CdrNo: msisdn,
      'B Party': bParty,
      'Total Duration': duration,
      Provider: provider
    }));
};

// Sheet 5: MAX STAY - Updated to consider most frequent address
const generateMaxStay = (data: any[], provider: string, msisdn: string) => {
  const locations: { [key: string]: {
    totalCalls: number;
    dates: Set<string>;
    firstCall: string | null;
    lastCall: string | null;
    address: string;
  } } = {};
  
  data.forEach(row => {
    const mapped = mapProviderFields(row, provider);
    const address = mapped.firstBts || mapped.firstCellId || '';
    
    if (!locations[address]) {
      locations[address] = {
        totalCalls: 0,
        dates: new Set(),
        firstCall: null,
        lastCall: null,
        address: address
      };
    }
    
    const location = locations[address];
    location.totalCalls++;
    location.dates.add(mapped.date);
    
    const callDateTime = `${mapped.date} ${mapped.time}`;
    if (!location.firstCall || callDateTime < location.firstCall) {
      location.firstCall = callDateTime;
    }
    if (!location.lastCall || callDateTime > location.lastCall) {
      location.lastCall = callDateTime;
    }
  });
  
  return Object.entries(locations)
    .sort(([,a], [,b]) => b.totalCalls - a.totalCalls)
    .map(([address, location]) => ({
      CdrNo: msisdn,
      'Cell ID': address,
      'Total Calls': location.totalCalls,
      Days: location.dates.size,
      'Tower Address': location.address,
      Latitude: '',
      Longitude: '',
      Azimuth: '',
      Roaming: isRoaming(location.address, '') ? 'Yes' : 'No',
      'First Call Date': location.firstCall?.split(' ')[0] || '',
      'First Call Time': location.firstCall?.split(' ')[1] || '',
      'Last Call Date': location.lastCall?.split(' ')[0] || '',
      'Last Call Time': location.lastCall?.split(' ')[1] || ''
    }));
};

// Sheet 6: OTHER STATE CONTACT SUMMARY
const generateOtherStateContactSummary = (data: any[], provider: string, msisdn: string) => {
  const circles = {};
  
  data.forEach(row => {
    const mapped = mapProviderFields(row, provider);
    const circle = mapped.roaming || 'Local';
    
    if (!circles[circle]) {
      circles[circle] = {
        totalCalls: 0,
        outCalls: 0,
        inCalls: 0,
        outSms: 0,
        inSms: 0,
        totalDuration: 0
      };
    }
    
    const circleData = circles[circle];
    circleData.totalCalls++;
    
    if (mapped.callType?.toLowerCase().includes('out')) {
      circleData.outCalls++;
    } else if (mapped.callType?.toLowerCase().includes('in')) {
      circleData.inCalls++;
    }
    
    if (mapped.serviceType?.toLowerCase().includes('sms')) {
      if (mapped.callType?.toLowerCase().includes('out')) {
        circleData.outSms++;
      } else if (mapped.callType?.toLowerCase().includes('in')) {
        circleData.inSms++;
      }
    }
    
    circleData.totalDuration += parseCallDuration(mapped.duration);
  });
  
  return Object.entries(circles).map(([circle, data]: [string, any]) => ({
    CdrNo: msisdn,
    Circle: circle,
    'Total Calls': data.totalCalls,
    'Out Calls': data.outCalls,
    'In Calls': data.inCalls,
    'Out Sms': data.outSms,
    'In Sms': data.inSms,
    'Other Calls': data.totalCalls - data.outCalls - data.inCalls,
    'Total Duration': data.totalDuration
  }));
};

// Generate remaining sheets (7-16) with similar patterns
const generateRoamingPeriod = (data: any[], provider: string, msisdn: string) => {
  const roamingData = data.filter(row => {
    const mapped = mapProviderFields(row, provider);
    return isRoaming(mapped.firstBts, mapped.roaming);
  });
  
  return generatePeriodAnalysis(roamingData, provider, msisdn, 'roaming');
};

const generateImeiPeriod = (data: any[], provider: string, msisdn: string) => {
  return generatePeriodAnalysis(data, provider, msisdn, 'imei');
};

const generateImsiPeriod = (data: any[], provider: string, msisdn: string) => {
  return generatePeriodAnalysis(data, provider, msisdn, 'imsi');
};

const generatePeriodAnalysis = (data: any[], provider: string, msisdn: string, type: string) => {
  const groups = {};
  
  data.forEach(row => {
    const mapped = mapProviderFields(row, provider);
    const key = type === 'roaming' ? mapped.roaming : 
                type === 'imei' ? mapped.imei : mapped.imsi;
    
    if (!groups[key]) {
      groups[key] = {
        totalCalls: 0,
        dates: new Set(),
        outCalls: 0,
        inCalls: 0,
        outSms: 0,
        inSms: 0,
        totalDuration: 0,
        firstLocation: '',
        lastLocation: '',
        firstCall: null,
        lastCall: null
      };
    }
    
    const group = groups[key];
    group.totalCalls++;
    group.dates.add(mapped.date);
    group.totalDuration += parseCallDuration(mapped.duration);
    
    if (mapped.callType?.toLowerCase().includes('out')) {
      group.outCalls++;
    } else if (mapped.callType?.toLowerCase().includes('in')) {
      group.inCalls++;
    }
    
    if (mapped.serviceType?.toLowerCase().includes('sms')) {
      if (mapped.callType?.toLowerCase().includes('out')) {
        group.outSms++;
      } else if (mapped.callType?.toLowerCase().includes('in')) {
        group.inSms++;
      }
    }
    
    const location = mapped.firstBts || mapped.firstCellId || '';
    if (!group.firstLocation) group.firstLocation = location;
    group.lastLocation = location;
    
    const callDateTime = `${mapped.date} ${mapped.time}`;
    if (!group.firstCall || callDateTime < group.firstCall) {
      group.firstCall = callDateTime;
    }
    if (!group.lastCall || callDateTime > group.lastCall) {
      group.lastCall = callDateTime;
    }
  });
  
  const result = Object.entries(groups).map(([key, group]: [string, any]) => {
    const baseData = {
      CdrNo: msisdn,
      Period: `${group.firstCall?.split(' ')[0]} - ${group.lastCall?.split(' ')[0]}`,
      'Total Calls': group.totalCalls,
      Days: group.dates.size,
      'First Location': group.firstLocation,
      'Last Location': group.lastLocation,
      'Out Calls': group.outCalls,
      'In Calls': group.inCalls,
      'Out Sms': group.outSms,
      'In Sms': group.inSms,
      'Other Calls': group.totalCalls - group.outCalls - group.inCalls,
      'Total Duration': group.totalDuration
    };
    
    if (type === 'imei') {
      return {
        ...baseData,
        IMEI: key,
        'IMEI Manufacturer': '',
        'Device Type': ''
      };
    } else if (type === 'imsi') {
      return {
        ...baseData,
        IMSI: key
      };
    } else {
      return {
        ...baseData,
        Roaming: key
      };
    }
  });
  
  return result;
};

const generateOffUnusedPeriod = (data: any[], provider: string, msisdn: string) => {
  // This requires complex analysis of gaps in usage
  return [{
    CdrNo: msisdn,
    Period: '',
    'Total Days': 0,
    'IMEI(OFF)': '',
    'IMEI(ON)': '',
    'IMSI(OFF)': '',
    'IMSI(ON)': '',
    'Location(OFF)': '',
    'Location(ON)': '',
    'Circle(OFF)': '',
    'Circle(ON)': ''
  }];
};

const generateNightMapping = (data: any[], provider: string, msisdn: string) => {
  const nightData = data.filter(row => {
    const mapped = mapProviderFields(row, provider);
    return isNightTime(mapped.time);
  });
  
  return nightData.map((row, index) => {
    const mapped = mapProviderFields(row, provider);
    return {
      CdrNo: msisdn,
      'B Party': mapped.bParty,
      Date: mapped.date,
      Time: mapped.time,
      Duration: parseCallDuration(mapped.duration),
      'Call Type': mapped.callType,
      'First Cell ID': mapped.firstCellId,
      'First Cell ID Address': mapped.firstBts || '',
      'Last Cell ID': mapped.lastCellId,
      'Last Cell ID Address': mapped.lastBts || '',
      IMEI: mapped.imei,
      IMSI: mapped.imsi,
      Roaming: mapped.roaming,
      'Main City(First CellID)': '',
      'Sub City(First CellID)': '',
      'Lat-Long-Azimuth (First CellID)': '',
      Crime: '',
      Circle: mapped.roaming,
      Operator: provider,
      AreaLocation: mapped.firstBts || '',
      DateTime: `${mapped.date} ${mapped.time}`,
      NumTmp: mapped.targetNo,
      LRN: mapped.lrn,
      CallForward: mapped.callForward,
      RoamingOriginated: mapped.roaming,
      'B Party Provider': '',
      'B Party Circle': '',
      'B Party Operator': '',
      Type: mapped.serviceType,
      'IMEI Manufacturer': '',
      'Device Type': '',
      Location: mapped.firstBts || '',
      RoamGroup: '',
      ImeiGroup: '',
      ImsiGroup: '',
      TimeHH: mapped.time ? mapped.time.split(':')[0] : ''
    };
  });
};

const generateNightMaxStay = (data: any[], provider: string, msisdn: string) => {
  const nightData = data.filter(row => {
    const mapped = mapProviderFields(row, provider);
    return isNightTime(mapped.time);
  });
  
  return generateMaxStay(nightData, provider, msisdn);
};

const generateDayMapping = (data: any[], provider: string, msisdn: string) => {
  const dayData = data.filter(row => {
    const mapped = mapProviderFields(row, provider);
    return !isNightTime(mapped.time);
  });
  
  return dayData.map((row, index) => {
    const mapped = mapProviderFields(row, provider);
    return {
      CdrNo: msisdn,
      'B Party': mapped.bParty,
      Date: mapped.date,
      Time: mapped.time,
      Duration: parseCallDuration(mapped.duration),
      'Call Type': mapped.callType,
      'First Cell ID': mapped.firstCellId,
      'First Cell ID Address': mapped.firstBts || '',
      'Last Cell ID': mapped.lastCellId,
      'Last Cell ID Address': mapped.lastBts || '',
      IMEI: mapped.imei,
      IMSI: mapped.imsi,
      Roaming: mapped.roaming,
      'Main City(First CellID)': '',
      'Sub City(First CellID)': '',
      'Lat-Long-Azimuth (First CellID)': '',
      Crime: '',
      Circle: mapped.roaming,
      Operator: provider,
      AreaLocation: mapped.firstBts || '',
      DateTime: `${mapped.date} ${mapped.time}`,
      NumTmp: mapped.targetNo,
      LRN: mapped.lrn,
      CallForward: mapped.callForward,
      RoamingOriginated: mapped.roaming,
      'B Party Provider': '',
      'B Party Circle': '',
      'B Party Operator': '',
      Type: mapped.serviceType,
      'IMEI Manufacturer': '',
      'Device Type': '',
      Location: mapped.firstBts || '',
      RoamGroup: '',
      ImeiGroup: '',
      ImsiGroup: '',
      TimeHH: mapped.time ? mapped.time.split(':')[0] : ''
    };
  });
};

const generateDayMaxStay = (data: any[], provider: string, msisdn: string) => {
  const dayData = data.filter(row => {
    const mapped = mapProviderFields(row, provider);
    return !isNightTime(mapped.time);
  });
  
  return generateMaxStay(dayData, provider, msisdn);
};

const generateWorkHomeLocation = (data: any[], provider: string, msisdn: string) => {
  const locations = generateMaxStay(data, provider, msisdn);
  return locations.map(location => ({
    ...location,
    Location: 'Work/Home' // This would need more sophisticated analysis
  }));
};

const generateHomeLocationBasedOnDayFirst = (data: any[], provider: string, msisdn: string) => {
  const dayData = data.filter(row => {
    const mapped = mapProviderFields(row, provider);
    return !isNightTime(mapped.time);
  });
  
  const locations = generateMaxStay(dayData, provider, msisdn);
  return locations.slice(0, 5); // Top 5 day locations as potential home locations
};
