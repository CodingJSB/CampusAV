import * as XLSX from 'xlsx';
import { AVItem, EquipmentCategory, EquipmentCondition, MaintenanceStatus } from '../types/inventory';
import { enrichAVItem } from './calculations';

/**
 * Normalizes string keys for flexible header matching
 */
function cleanKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolves equipment make/model and serial number strictly preserving raw input:
 * - NEVER appends creative descriptions (e.g. "Vaddio" stays strictly "Vaddio").
 * - If a single column was named "Equipment & Serial" or "Equipment & Serial #":
 *   - Extracts embedded serial number if formatted like "Model - SN: 12345" or "Model (S/N 12345)"
 *   - If no embedded serial exists (e.g. just "Vaddio"), keeps "Vaddio" as makeModel and defaults serialNumber to "NA".
 */
export function resolveEquipmentAndSerial(
  rawEquipment: any,
  rawSerial: any,
  isSameColumn: boolean = false
): { makeModel: string; serialNumber: string } {
  let eq = String(rawEquipment || '').trim();
  let sn = String(rawSerial || '').trim();

  // If both were mapped to the exact same column, or rawSerial is duplicate of eq
  if (isSameColumn || (eq && (!sn || sn === eq))) {
    // Check if eq contains an explicit serial pattern like " - S/N: 12345", " / SN: 12345", "(SN: 12345)"
    const match = eq.match(/^(.*?)\s*[-/|(,]\s*(?:s\/?n|serial|sn#?|tag)[:\s#]*([A-Za-z0-9_-]+)\)?$/i);
    if (match && match[1] && match[2]) {
      return {
        makeModel: match[1].trim() || eq,
        serialNumber: match[2].trim(),
      };
    }
    return {
      makeModel: eq || 'Standard AV Device',
      serialNumber: sn && sn !== eq ? sn : 'NA',
    };
  }

  return {
    makeModel: eq || 'Standard AV Device',
    serialNumber: sn || 'NA',
  };
}

/**
 * Resolves equipment category strictly respecting user data:
 * 1. If the CSV has a category value, use it directly (preserving the user's category name).
 * 2. Does NOT creatively force "Projector" into "Laser Projector" vs "Lamp Projector".
 * 3. Only if the category is empty, apply a conservative, non-aggressive fallback.
 * 4. Never default unmatched items to "Laser Projector" (use "Other AV Equipment").
 */
export function resolveCategory(rawCategory: any, makeModel: string = ''): string {
  const trimmed = String(rawCategory || '').trim();
  if (trimmed) {
    return trimmed;
  }

  // Only if category is blank in CSV, fallback conservatively based on model/name:
  const s = String(makeModel || '').toLowerCase().trim();
  if (!s || s === 'standard av device') {
    return 'Other AV Equipment';
  }

  // Check Screen first so "Projector Screen" isn't miscategorized as a Projector
  if (s.includes('screen') || s.includes('da-lite') || s.includes('draper')) {
    return 'Screen';
  }

  // Factual, simple Projector categorization - no guesswork on laser vs lamp
  if (s.includes('projector') || s.includes('proj')) {
    if (s.includes('short throw') || s.includes('short-throw')) {
      return 'Projector (Short-throw)';
    }
    return 'Projector';
  }

  if (s.includes('touch') || s.includes('interactive') || s.includes('smart board') || s.includes('smartboard')) {
    return 'Interactive Touch Display';
  }

  if (s.includes('flat') || s.includes('panel') || s.includes('tv') || s.includes('display') || s.includes('monitor')) {
    return 'Commercial Flat Panel';
  }

  if (s.includes('switch') || s.includes('matrix')) {
    return 'AV Matrix Switcher / Controller';
  }

  if (s.includes('controller') || s.includes('touchpanel') || s.includes('keypad')) {
    return 'Control Touchpanel';
  }

  if (s.includes('camera') || s.includes('ptz') || s.includes('webcam')) {
    return 'HyFlex PTZ Camera';
  }

  if (s.includes('mic') || s.includes('audio') || s.includes('dsp') || s.includes('speaker') || s.includes('soundbar') || s.includes('amplifier')) {
    return 'Audio DSP & Mic Array';
  }

  if (s.includes('wireless') || s.includes('solstice') || s.includes('clickshare') || s.includes('airmedia')) {
    return 'Wireless Presentation Gateway';
  }

  if (s.includes('doc') || s.includes('document') || s.includes('elmo') || s.includes('wolfvision')) {
    return 'Lectern PC & Doc Cam';
  }

  if (s.includes('assistive') || s.includes('hearing') || s.includes('ada')) {
    return 'Assistive Listening System';
  }

  return 'Other AV Equipment';
}

function normalizeCondition(raw: string): EquipmentCondition {
  const s = String(raw || '').toLowerCase();
  if (s.includes('crit') || s.includes('fail') || s.includes('broken')) return 'Critical';
  if (s.includes('poor') || s.includes('bad') || s.includes('degrad')) return 'Poor';
  if (s.includes('fair') || s.includes('mod') || s.includes('avg')) return 'Fair';
  if (s.includes('excel') || s.includes('new') || s.includes('pristine')) return 'Excellent';
  return 'Good';
}

function normalizeMaintenanceStatus(raw: any): MaintenanceStatus {
  if (!raw) return 'Operational';
  const s = String(raw).toLowerCase().trim();
  if (
    !s ||
    s === 'none' ||
    s === 'na' ||
    s === 'n/a' ||
    s === 'operational' ||
    s === 'good' ||
    s === 'active' ||
    s === 'in use' ||
    s === 'working' ||
    s === 'ok' ||
    s === 'installed' ||
    s === 'existing' ||
    s === 'deployed'
  ) {
    return 'Operational';
  }
  // Only flag if explicit maintenance terminology is present
  if (
    s === 'out of service' ||
    s.includes('out of service') ||
    s === 'offline' ||
    s === 'broken' ||
    s === 'inoperable' ||
    s === 'down'
  ) {
    return 'Out of Service';
  }
  if (
    s === 'scheduled repair' ||
    s.includes('scheduled repair') ||
    s === 'in repair' ||
    s.includes('repair scheduled') ||
    s.includes('pending repair')
  ) {
    return 'Scheduled Repair';
  }
  if (
    s === 'requires service' ||
    s.includes('requires service') ||
    s.includes('needs repair') ||
    s.includes('maintenance required') ||
    s === 'faulty' ||
    s === 'defective'
  ) {
    return 'Requires Service';
  }
  return 'Operational';
}

function normalizeActiveIssue(raw: any): string {
  if (!raw) return 'None';
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (
    !s ||
    lower === 'none' ||
    lower === 'na' ||
    lower === 'n/a' ||
    lower === 'no' ||
    lower === '-' ||
    lower === 'nil' ||
    lower === 'null' ||
    lower === 'operational' ||
    lower === 'ok' ||
    lower === 'good' ||
    lower === 'normal'
  ) {
    return 'None';
  }
  return s;
}

function normalizeDate(raw: any): string {
  if (!raw) return '2022-07-01';
  const str = String(raw).trim();
  // If 4-digit year like 2025 or 2016
  if (/^(19|20)\d{2}$/.test(str)) {
    return `${str}-07-01`;
  }

  // If Excel serial number date
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '2022-07-01';
}

export function getDefaultCostForCategory(category: string, model: string): number {
  const cat = String(category || '').toLowerCase();
  const mod = String(model || '').toLowerCase();
  const s = `${cat} ${mod}`;
  if (cat.includes('screen') || mod.includes('screen') || mod.includes('da-lite') || mod.includes('draper')) return 1250;
  if (s.includes('dmps') || s.includes('matrix') || s.includes('nvx')) return 6800;
  if (s.includes('switcher')) return 4500;
  if (s.includes('short-throw') || s.includes('short throw')) return 2800;
  if (s.includes('projector') || s.includes('phz') || s.includes('l630') || s.includes('epson') || s.includes('sony')) return 3500;
  if (s.includes('flat') || s.includes('panel') || s.includes('samsung')) return 1800;
  if (s.includes('wireless') || s.includes('airmedia') || s.includes('clickshare') || s.includes('solstice')) return 1400;
  if (s.includes('document') || s.includes('wolfvision') || s.includes('doc cam') || s.includes('elpdc')) return 1100;
  if (s.includes('controller') || s.includes('mlc') || s.includes('tsw')) return 1400;
  if (s.includes('mic') || s.includes('tesira') || s.includes('shure') || s.includes('vaddio')) return 2400;
  if (s.includes('camera') || s.includes('vaddio') || s.includes('huddlecam') || s.includes('ptz')) return 1800;
  if (s.includes('tv bar') || s.includes('video bar')) return 2400;
  if (s.includes('bluray') || s.includes('dvd') || s.includes('vcr')) return 350;
  return 1500;
}

function getDefaultLifespan(category: EquipmentCategory): number {
  const s = String(category).toLowerCase();
  if (s.includes('screen')) return 10;
  if (s.includes('controller')) return 7;
  if (s.includes('switcher')) return 7;
  if (s.includes('projector')) return 6;
  if (s.includes('flat') || s.includes('panel')) return 7;
  if (s.includes('wireless')) return 5;
  if (s.includes('mic') || s.includes('audio')) return 8;
  if (s.includes('camera')) return 6;
  if (s.includes('document')) return 7;
  return 7;
}

export interface ColumnMapping {
  room: string;
  roomName: string;
  building: string;
  spaceType: string;
  category: string;
  makeModel: string;
  serialNumber: string;
  installDate: string;
  installYear: string;
  shelflifeYears: string;
  replacementCost: string;
  installationLaborCost: string;
  condition: string;
  maintenanceStatus: string;
  activeIssue: string;
  assignedTech: string;
  vendor: string;
  notes: string;
}

export interface SpreadsheetInspection {
  headers: string[];
  sampleRows: Record<string, any>[];
  suggestedMapping: ColumnMapping;
  totalRows: number;
  filename: string;
  rawData: Record<string, any>[];
}

/**
 * Auto-detects suggested mapping for raw headers
 */
export function detectSuggestedMapping(headers: string[]): ColumnMapping {
  const findMatch = (...aliases: string[]) => {
    // 1st pass: exact match on clean key
    for (const alias of aliases) {
      const cleanAlias = cleanKey(alias);
      for (const h of headers) {
        if (cleanKey(h) === cleanAlias) {
          return h;
        }
      }
    }
    // 2nd pass: contains match, filtering out common false positives
    for (const alias of aliases) {
      const cleanAlias = cleanKey(alias);
      for (const h of headers) {
        const cleanedH = cleanKey(h);
        if (cleanedH.includes(cleanAlias)) {
          // If checking for 'type', prevent matching 'typeofspace', 'spacetype', or 'roomtype'
          if (cleanAlias === 'type' && (cleanedH.includes('space') || cleanedH.includes('room'))) {
            continue;
          }
          return h;
        }
      }
    }
    return '';
  };

  return {
    room: findMatch('room', 'classroom', 'roomnumber', 'space', 'location', 'rm'),
    roomName: findMatch('roomname', 'name', 'spacename', 'lab'),
    building: findMatch('building', 'facility', 'complex', 'hall', 'campus', 'dept'),
    spaceType: findMatch('typeofspace', 'spacetype', 'roomtype', 'space', 'usage'),
    category: findMatch('category', 'equipmentcategory', 'equipcategory', 'equipmenttype', 'equiptype', 'itemtype', 'devicetype', 'hardwarecategory', 'classification', 'type', 'class', 'group'),
    makeModel: findMatch('makemodel', 'model', 'equipment', 'item', 'device', 'name', 'description', 'hardware'),
    serialNumber: findMatch('serialnumber', 'serial', 'sn', 'assettag', 'tag', 'barcode', 'id'),
    installDate: findMatch('installdate', 'dateinstalled', 'purchasedate', 'acquisitiondate', 'installyear', 'date'),
    installYear: findMatch('installyear', 'year', 'purchaseyear'),
    shelflifeYears: findMatch('shelflifeyears', 'shelflife', 'lifespan', 'shelflifeyrs', 'expectedlife', 'cycle', 'useful life'),
    replacementCost: findMatch('replacementcost', 'hardwarecost', 'cost', 'unitcost', 'price', 'estimate', 'budget'),
    installationLaborCost: findMatch('installationlaborcost', 'laborcost', 'installationcost', 'labor', 'services'),
    condition: findMatch('condition', 'state', 'health', 'quality'),
    maintenanceStatus: findMatch('maintenancestatus', 'maintenance', 'servicestatus', 'repairhealth', 'hardwarestatus'),
    activeIssue: findMatch('activeissue', 'maintenanceticket', 'serviceticket', 'maintenanceissue', 'defect', 'hardwarefault', 'repairissue'),
    assignedTech: findMatch('assignedtech', 'tech', 'technician', 'lead', 'owner'),
    vendor: findMatch('vendor', 'integrator', 'contractor', 'partner'),
    notes: findMatch('notes', 'comments', 'remarks', 'memo', 'description'),
  };
}

/**
 * Inspects a spreadsheet and returns headers, sample rows, and suggested mappings
 */
export async function inspectSpreadsheet(file: File): Promise<SpreadsheetInspection> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Spreadsheet has no sheets.');

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  if (rawData.length === 0) throw new Error('Spreadsheet contains no data rows.');

  const headers = Object.keys(rawData[0] || {});
  const suggestedMapping = detectSuggestedMapping(headers);

  return {
    headers,
    sampleRows: rawData.slice(0, 3),
    suggestedMapping,
    totalRows: rawData.length,
    filename: file.name,
    rawData,
  };
}

/**
 * Parses raw data rows into enriched AV items using specified column mapping
 */
export function processRowsWithMapping(rawData: Record<string, any>[], mapping: ColumnMapping, filename: string): AVItem[] {
  return rawData.map((row, index) => {
    const getVal = (col: string) => (col && row[col] !== undefined ? row[col] : '');

    const room = getVal(mapping.room) || `Classroom ${index + 101}`;
    const roomName = getVal(mapping.roomName) || '';
    const building = getVal(mapping.building) || 'Main Campus';
    const spaceType = getVal(mapping.spaceType) || '';

    const rawEq = getVal(mapping.makeModel);
    const rawSn = getVal(mapping.serialNumber);
    const isSameColumn = Boolean(mapping.makeModel && mapping.makeModel === mapping.serialNumber);
    const { makeModel, serialNumber } = resolveEquipmentAndSerial(rawEq, rawSn, isSameColumn);

    const category = resolveCategory(getVal(mapping.category), makeModel);
    const rawDate = getVal(mapping.installDate) || getVal(mapping.installYear);
    const installDate = normalizeDate(rawDate);
    const installYear = getVal(mapping.installYear) || (installDate ? installDate.slice(0, 4) : 2025);

    const rawLifespan = getVal(mapping.shelflifeYears);
    const shelflifeYears = Number(rawLifespan) > 0 ? Number(rawLifespan) : getDefaultLifespan(category);

    // If replacement cost is empty or zero, apply category standard baseline estimate
    const rawCost = getVal(mapping.replacementCost);
    const replacementCost = Number(rawCost) > 0 ? Number(rawCost) : getDefaultCostForCategory(category, makeModel);

    const rawLabor = getVal(mapping.installationLaborCost);
    const installationLaborCost = Number(rawLabor) >= 0 && rawLabor !== '' ? Number(rawLabor) : Math.round(replacementCost * 0.15);

    const condition = normalizeCondition(getVal(mapping.condition));
    const maintenanceStatus = normalizeMaintenanceStatus(getVal(mapping.maintenanceStatus));
    const activeIssue = normalizeActiveIssue(getVal(mapping.activeIssue));
    const assignedTech = getVal(mapping.assignedTech) || 'AVC AV Support';
    const vendor = getVal(mapping.vendor) || 'AVC';
    const notes = getVal(mapping.notes) || '';

    const id = `AV-${String(building).slice(0, 3).toUpperCase()}-${String(room).replace(/[^a-zA-Z0-9]/g, '')}-${index + 1}`;

    return enrichAVItem({
      id,
      room: String(room).trim(),
      roomName: String(roomName).trim(),
      building: String(building).trim(),
      spaceType: String(spaceType).trim(),
      category,
      makeModel: String(makeModel).trim(),
      serialNumber: String(serialNumber).trim(),
      installDate,
      installYear,
      shelflifeYears,
      replacementCost,
      installationLaborCost,
      vendor: String(vendor).trim(),
      condition,
      maintenanceStatus,
      activeIssue: String(activeIssue).trim(),
      assignedTech: String(assignedTech).trim(),
      notes: String(notes).trim(),
    });
  });
}

/**
 * Parses user-uploaded Excel or CSV file directly in browser
 */
export async function parseSpreadsheetFile(file: File): Promise<{
  items: AVItem[];
  errors: string[];
  filename: string;
  totalRowsParsed: number;
}> {
  const errors: string[] = [];
  const buffer = await file.arrayBuffer();
  
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Spreadsheet has no sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
  });

  if (jsonData.length === 0) {
    throw new Error('Spreadsheet contains no data rows.');
  }

  const items: AVItem[] = [];

  jsonData.forEach((row, index) => {
    // Build lookup map with cleaned keys
    const rowMap: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      rowMap[cleanKey(key)] = row[key];
    });

    // Helper to find matching column value
    const findVal = (...aliases: string[]) => {
      for (const alias of aliases) {
        const clean = cleanKey(alias);
        if (rowMap[clean] !== undefined && rowMap[clean] !== '') {
          return rowMap[clean];
        }
      }
      return undefined;
    };

    const room = findVal('room', 'classroom', 'roomnumber', 'space', 'location') || `Classroom ${index + 101}`;
    const building = findVal('building', 'facility', 'complex', 'hall', 'campus') || 'Main Campus';
    const rawEq = findVal('equipmentandserial', 'equipmentserial', 'equipment', 'makemodel', 'model', 'item', 'device', 'name', 'description');
    const rawSn = findVal('serialnumber', 'serialno', 'serialnum', 'sn', 'assettag', 'tag', 'serial', 'id');
    const { makeModel, serialNumber } = resolveEquipmentAndSerial(rawEq, rawSn, false);
    const rawCategory = findVal('category', 'equipmentcategory', 'equipcategory', 'equipmenttype', 'equiptype', 'itemtype', 'devicetype', 'type', 'class', 'group');
    const category = resolveCategory(rawCategory, makeModel);
    const installDate = normalizeDate(findVal('installdate', 'purchased', 'dateinstalled', 'purchasedate', 'date', 'year'));
    
    // Shelflife
    const rawLifespan = findVal('shelflifeyears', 'shelflife', 'lifespan', 'shelflifeyrs', 'expectedlife', 'cycle');
    const shelflifeYears = Number(rawLifespan) > 0 ? Number(rawLifespan) : getDefaultLifespan(category);

    // Costs
    const rawCost = findVal('replacementcost', 'hardwarecost', 'cost', 'unitcost', 'price', 'estimate');
    const replacementCost = Number(rawCost) > 0 ? Number(rawCost) : 3200;

    const rawLabor = findVal('installationlaborcost', 'laborcost', 'installationcost', 'labor', 'servicecost');
    const installationLaborCost = Number(rawLabor) >= 0 ? Number(rawLabor) : Math.round(replacementCost * 0.15);

    const condition = normalizeCondition(findVal('condition', 'state', 'health'));
    const maintenanceStatus = normalizeMaintenanceStatus(findVal('maintenancestatus', 'servicestatus', 'hardwarestatus', 'maintenance'));
    const activeIssue = normalizeActiveIssue(findVal('activeissue', 'maintenanceticket', 'serviceticket', 'maintenanceissue', 'defect'));
    const assignedTech = findVal('assignedtech', 'tech', 'technician', 'lead') || 'AV Campus Team';
    const notes = findVal('notes', 'comments', 'memo') || '';

    const id = findVal('id', 'assetid') || `AV-${building.slice(0, 3).toUpperCase()}-${index + 101}`;

    const enriched = enrichAVItem({
      id,
      room: String(room).trim(),
      building: String(building).trim(),
      category,
      makeModel: String(makeModel).trim(),
      serialNumber: String(serialNumber).trim(),
      installDate,
      shelflifeYears,
      replacementCost,
      installationLaborCost,
      condition,
      maintenanceStatus,
      activeIssue: String(activeIssue).trim(),
      assignedTech: String(assignedTech).trim(),
      notes: String(notes).trim(),
    });

    items.push(enriched);
  });

  return {
    items,
    errors,
    filename: file.name,
    totalRowsParsed: jsonData.length,
  };
}

/**
 * Downloads a spreadsheet template for college AV departments
 */
export function downloadTemplateSpreadsheet(format: 'xlsx' | 'csv' = 'xlsx') {
  const headers = [
    {
      'Asset ID': 'AV-SCI-101',
      'Building': 'Science & Technology Hall',
      'Room / Space': 'Science 101 (Tiered Lecture)',
      'Equipment Category': 'Laser Projector',
      'Make / Model': 'Panasonic PT-MZ780 (7,000 lm)',
      'Serial / Asset Tag': 'PAN-90218-MZ7',
      'Install Date (YYYY-MM-DD)': '2021-08-15',
      'Shelflife / Lifespan (Years)': 5,
      'Replacement Cost ($)': 4800,
      'Installation / Labor Cost ($)': 850,
      'Physical Condition': 'Good',
      'Maintenance Status': 'Operational',
      'Active Issue / Ticket': 'None',
      'Assigned Technician': 'Marcus Vance',
      'Notes / Special Instructions': '180-seat flagship lecture hall',
    },
    {
      'Asset ID': 'AV-ART-204',
      'Building': 'Fine Arts Complex',
      'Room / Space': 'Arts 204 (Studio)',
      'Equipment Category': 'Interactive Touch Display',
      'Make / Model': 'Samsung Flip Pro 85"',
      'Serial / Asset Tag': 'SAM-88301-FLP',
      'Install Date (YYYY-MM-DD)': '2020-09-01',
      'Shelflife / Lifespan (Years)': 6,
      'Replacement Cost ($)': 3900,
      'Installation / Labor Cost ($)': 450,
      'Physical Condition': 'Fair',
      'Maintenance Status': 'Requires Service',
      'Active Issue / Ticket': 'Digitizer drift on lower corner',
      'Assigned Technician': 'Elena Rostova',
      'Notes / Special Instructions': 'Used for digital drawing classes',
    },
    {
      'Asset ID': 'AV-ENG-301',
      'Building': 'Engineering Research Center',
      'Room / Space': 'Engineering 301',
      'Equipment Category': 'AV Matrix Switcher / Controller',
      'Make / Model': 'Crestron DMPS3-4K-350-C',
      'Serial / Asset Tag': 'CRS-77109-DMP',
      'Install Date (YYYY-MM-DD)': '2019-04-10',
      'Shelflife / Lifespan (Years)': 7,
      'Replacement Cost ($)': 7800,
      'Installation / Labor Cost ($)': 1600,
      'Physical Condition': 'Poor',
      'Maintenance Status': 'Scheduled Repair',
      'Active Issue / Ticket': 'DM 8G+ port 3 sync drop',
      'Assigned Technician': 'David Kim',
      'Notes / Special Instructions': 'Overdue for replacement in upcoming fiscal year',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(headers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AV Inventory Template');

  const filename = `College_AV_Inventory_Template.${format}`;
  XLSX.writeFile(workbook, filename, { bookType: format });
}

/**
 * Exports current active items to Excel or CSV
 */
export function exportActiveInventory(items: AVItem[], format: 'xlsx' | 'csv' = 'xlsx', customFilename?: string) {
  const exportRows = items.map((item) => ({
    'Asset ID': item.id,
    'Building': item.building,
    'Room': item.room,
    'Room Name': item.roomName || '',
    'Type of Space': item.spaceType || '',
    'Category': item.category,
    'Make & Model': item.makeModel,
    'Serial Number': item.serialNumber,
    'Install Date': item.installDate,
    'Age (Years)': item.ageYears,
    'Shelflife (Years)': item.shelflifeYears,
    'Remaining Life (Years)': item.remainingYears,
    'Lifecycle Status': item.lifecycleStatus,
    'Replacement Fiscal Year': item.replacementFiscalYear,
    'Scheduled Quarter': item.scheduledQuarter || '',
    'Replacement Cost ($)': item.replacementCost,
    'Installation Labor Cost ($)': item.installationLaborCost,
    'Total Replacement Cost ($)': item.totalReplacementCost,
    'Physical Condition': item.condition,
    'Maintenance Status': item.maintenanceStatus,
    'Active Issue': item.activeIssue || 'None',
    'Assigned Technician': item.assignedTech || '',
    'Vendor': item.vendor || '',
    'Notes': item.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'AV Fleet Inventory');

  const filename = customFilename || `College_AV_Inventory_Export_${new Date().toISOString().split('T')[0]}.${format}`;
  XLSX.writeFile(workbook, filename, { bookType: format });
}
