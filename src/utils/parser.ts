import { QuotationItem, ColumnMapping } from '../types';
import { parseNumber, extractDiscountPercent } from './numberFormat';

export interface ParseResult {
  items: QuotationItem[];
  detectedDelimiter: string;
  headers: string[];
  rawRows: string[][];
  mapping: ColumnMapping;
  hasHeaderRow: boolean;
}

// Standard header keywords for intelligent auto-detection
const HEADER_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
  no: ['no', 'item', 'line', 'pos', 'nomor', 'seq', '#'],
  material: ['material', 'part number', 'part no', 'part_no', 'partnum', 'kode', 'item code', 'mat nr', 'material no', 'kode barang'],
  itc: ['itc', 'type', 'kategori', 'item type', 'kat', 'grp'],
  description: ['description', 'desc', 'nama barang', 'deskripsi', 'nama item', 'item description', 'part name', 'keterangan barang', 'nama'],
  jumlah: ['jumlah', 'qty', 'quantity', 'kuantitas', 'jml', 'count', 'vol', 'banyaknya'],
  unit: ['unit', 'uom', 'satuan', 'sat', 'pc', 'pcs'],
  price: ['price', 'gross price', 'unit price', 'harga', 'harga satuan', 'gross', 'list price', 'harga normal', 'harga pricelist', 'prc'],
  specialPrice: ['special price', 'special', 'net price', 'harga jual', 'harga diskon', 'net unit price', 'harga neto', 'sp price', 'spec price', 'harga penawaran'],
  amount: ['amount', 'total', 'jumlah harga', 'subtotal', 'total harga', 'ext price', 'extended price', 'amt'],
  stock: ['stock', 'stk', 'lokasi', 'loc', 'location', 'plant', 'tmd', 'warehouse', 'gudang', 'avail'],
  estimasiLeadtime: ['estimasi leadtime', 'leadtime', 'lead time', 'delivery', 'delivery time', 'estimasi', 'waktu pengiriman', 'etd', 'lt', 'est leadtime'],
  remarks: ['remarks', 'remark', 'keterangan', 'diskon', 'discount', 'disc', 'notes', 'catatan', 'ket']
};

/**
 * Detect the delimiter used in a multi-line text (tab, semicolon, pipe, comma, or multi-space)
 */
export function detectDelimiter(text: string): string {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return '\t';

  const testLine = lines[0];
  const tabCount = (testLine.match(/\t/g) || []).length;
  const semicolonCount = (testLine.match(/;/g) || []).length;
  const pipeCount = (testLine.match(/\|/g) || []).length;
  const commaCount = (testLine.match(/,/g) || []).length;

  if (tabCount >= 2) return '\t';
  if (pipeCount >= 2) return '|';
  if (semicolonCount >= 2) return ';';
  if (commaCount >= 3) return ',';
  
  return '\t';
}

/**
 * Split a single line according to delimiter or regex
 */
export function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '|') {
    return line.split('|').map(c => c.trim()).filter((_, idx, arr) => !(idx === 0 && _ === '') && !(idx === arr.length - 1 && _ === ''));
  }
  if (delimiter === '\t') {
    return line.split('\t').map(c => c.trim());
  }
  if (delimiter === ';') {
    return line.split(';').map(c => c.trim());
  }
  if (delimiter === ',') {
    // Simple CSV parser supporting quotes
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  // Fallback: split by 2 or more spaces or tabs
  return line.split(/\s{2,}|\t/).map(c => c.trim());
}

/**
 * Infer the best column mapping from a list of header string tokens
 */
export function inferColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    no: -1,
    material: -1,
    itc: -1,
    description: -1,
    jumlah: -1,
    unit: -1,
    price: -1,
    specialPrice: -1,
    amount: -1,
    stock: -1,
    estimasiLeadtime: -1,
    remarks: -1
  };

  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[_\-:]/g, ' '));

  const assignedIndices = new Set<number>();

  // Prioritize exact matching
  for (const [colKey, keywords] of Object.entries(HEADER_KEYWORDS) as [keyof ColumnMapping, string[]][]) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (assignedIndices.has(i)) continue;
      const h = normalizedHeaders[i];
      if (keywords.includes(h)) {
        mapping[colKey] = i;
        assignedIndices.add(i);
        break;
      }
    }
  }

  // Secondary pass: fuzzy partial inclusion
  for (const [colKey, keywords] of Object.entries(HEADER_KEYWORDS) as [keyof ColumnMapping, string[]][]) {
    if (mapping[colKey] !== -1) continue;
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (assignedIndices.has(i)) continue;
      const h = normalizedHeaders[i];
      if (keywords.some(k => h.includes(k) || k.includes(h))) {
        mapping[colKey] = i;
        assignedIndices.add(i);
        break;
      }
    }
  }

  // Default fallback if headers were generic or not found: assign sequential columns if matched standard 12 columns
  if (headers.length >= 8 && mapping.material === -1 && mapping.description === -1) {
    // Check standard UT layout:
    // 0: No, 1: Material, 2: ITC, 3: Description, 4: Jumlah, 5: Unit, 6: Price, 7: Special Price, 8: Amount, 9: Stock, 10: Estimasi Leadtime, 11: Remarks
    if (headers.length >= 12) {
      mapping.no = 0;
      mapping.material = 1;
      mapping.itc = 2;
      mapping.description = 3;
      mapping.jumlah = 4;
      mapping.unit = 5;
      mapping.price = 6;
      mapping.specialPrice = 7;
      mapping.amount = 8;
      mapping.stock = 9;
      mapping.estimasiLeadtime = 10;
      mapping.remarks = 11;
    } else if (headers.length === 11) {
      // Missing ITC
      mapping.no = 0;
      mapping.material = 1;
      mapping.itc = -1;
      mapping.description = 2;
      mapping.jumlah = 3;
      mapping.unit = 4;
      mapping.price = 5;
      mapping.specialPrice = 6;
      mapping.amount = 7;
      mapping.stock = 8;
      mapping.estimasiLeadtime = 9;
      mapping.remarks = 10;
    } else {
      // Best guess for basic columns
      mapping.no = 0;
      mapping.material = 1;
      mapping.description = 2;
      mapping.jumlah = 3;
      mapping.unit = 4;
      mapping.price = 5;
      mapping.specialPrice = 6;
      mapping.amount = 7;
      if (headers.length > 8) mapping.stock = 8;
      if (headers.length > 9) mapping.estimasiLeadtime = 9;
      if (headers.length > 10) mapping.remarks = 10;
    }
  }

  return mapping;
}

/**
 * Check if the first row is likely a header row
 */
export function isHeaderRow(row: string[]): boolean {
  if (!row || row.length === 0) return false;
  
  // 1. If the first column is a pure number or sequence (e.g. "10", "20", "1", "01"), it's almost certainly a data row
  const firstCol = (row[0] || '').trim();
  if (/^\d+$/.test(firstCol) && parseInt(firstCol, 10) > 0) {
    return false;
  }

  // 2. If row has typical part numbers (e.g. 569-61-82511) or formatted currency prices (e.g. 19.468.300), it's a data row
  const hasPartNumber = row.some(cell => /^[0-9A-Z]{3,}-[0-9A-Z]{2,}-[0-9A-Z]{3,}$/i.test(cell.trim()));
  const hasCurrencyFormat = row.some(cell => /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cell.trim()));
  if (hasPartNumber || hasCurrencyFormat) {
    return false;
  }

  // 3. Check for specific header keyword tokens matching individual cell contents
  const headerTokens = new Set([
    'no', 'nomor', 'item', 'pos', 'line', 'seq', '#',
    'material', 'part number', 'part no', 'part_no', 'partnum', 'kode', 'kode barang', 'material no', 'mat nr',
    'itc', 'type', 'kategori', 'item type',
    'description', 'desc', 'nama barang', 'deskripsi', 'nama item', 'part name', 'keterangan barang',
    'jumlah', 'qty', 'quantity', 'kuantitas', 'jml', 'vol', 'banyaknya',
    'unit', 'uom', 'satuan', 'sat',
    'price', 'gross price', 'unit price', 'harga', 'harga satuan', 'gross', 'list price', 'harga normal', 'prc',
    'special price', 'special', 'net price', 'harga jual', 'harga diskon', 'net unit price', 'sp price',
    'amount', 'total', 'jumlah harga', 'subtotal', 'total harga', 'ext price', 'amt',
    'stock', 'stk', 'lokasi', 'tmd', 'warehouse', 'gudang', 'avail', 'plant',
    'estimasi leadtime', 'leadtime', 'lead time', 'delivery', 'etd', 'waktu pengiriman', 'lt',
    'remarks', 'remark', 'keterangan', 'diskon', 'discount', 'disc', 'notes', 'catatan'
  ]);

  let matchedCount = 0;
  for (const cell of row) {
    const clean = cell.toLowerCase().trim().replace(/[_\-:]/g, ' ');
    if (!clean) continue;
    if (headerTokens.has(clean)) {
      matchedCount++;
    } else {
      // Check if any keyword matches as a standalone word in the cell
      for (const token of headerTokens) {
        if (new RegExp(`^${token}$|\\b${token}\\b`, 'i').test(clean)) {
          matchedCount++;
          break;
        }
      }
    }
  }

  return matchedCount >= 3;
}

/**
 * Main parser function to convert raw text into parsed items and mapped structure
 */
export function parseRawPastedText(rawText: string, customDelimiter?: string, overrideMapping?: ColumnMapping): ParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      items: [],
      detectedDelimiter: '\t',
      headers: [],
      rawRows: [],
      mapping: {
        no: 0, material: 1, itc: 2, description: 3, jumlah: 4, unit: 5,
        price: 6, specialPrice: 7, amount: 8, stock: 9, estimasiLeadtime: 10, remarks: 11
      },
      hasHeaderRow: false
    };
  }

  const delimiter = customDelimiter || detectDelimiter(rawText);
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  const rawRows: string[][] = lines.map(line => splitLine(line, delimiter));

  if (rawRows.length === 0) {
    return {
      items: [],
      detectedDelimiter: delimiter,
      headers: [],
      rawRows: [],
      mapping: {
        no: 0, material: 1, itc: 2, description: 3, jumlah: 4, unit: 5,
        price: 6, specialPrice: 7, amount: 8, stock: 9, estimasiLeadtime: 10, remarks: 11
      },
      hasHeaderRow: false
    };
  }

  const hasHeader = isHeaderRow(rawRows[0]);
  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (hasHeader) {
    headers = rawRows[0];
    dataRows = rawRows.slice(1);
  } else {
    // Generate placeholder headers Column 1, Column 2...
    const maxCols = Math.max(...rawRows.map(r => r.length));
    headers = Array.from({ length: maxCols }, (_, i) => `Kolom ${i + 1}`);
    dataRows = rawRows;
  }

  const mapping = overrideMapping || inferColumnMapping(headers);

  const items: QuotationItem[] = dataRows.map((row, idx) => {
    const getVal = (colIndex: number): string => {
      if (colIndex === -1 || colIndex >= row.length) return '';
      return (row[colIndex] || '').trim();
    };

    const noVal = getVal(mapping.no) || String((idx + 1) * 10);
    const materialVal = getVal(mapping.material);
    const itcVal = getVal(mapping.itc);
    const descVal = getVal(mapping.description) || (materialVal ? `Part ${materialVal}` : `Item ${idx + 1}`);
    
    const qtyStr = getVal(mapping.jumlah);
    const jumlahVal = qtyStr ? Math.max(1, parseNumber(qtyStr)) : 1;
    
    const unitVal = getVal(mapping.unit) || 'PC';
    
    const priceStr = getVal(mapping.price);
    let priceVal = parseNumber(priceStr);
    
    const specPriceStr = getVal(mapping.specialPrice);
    let specialPriceVal = specPriceStr ? parseNumber(specPriceStr) : 0;

    let remarksVal = getVal(mapping.remarks);
    const discFromRemarks = extractDiscountPercent(remarksVal);

    // Bidirectional Price vs Special Price vs Discount calculation
    if (discFromRemarks !== null && discFromRemarks > 0 && discFromRemarks <= 100) {
      if (priceVal > 0 && (!specialPriceVal || specialPriceVal === 0 || specialPriceVal === priceVal)) {
        // Gross Price provided + Discount in remarks -> calculate Special Price
        specialPriceVal = Math.round(priceVal * (1 - discFromRemarks / 100));
      } else if (specialPriceVal > 0 && (!priceVal || priceVal === 0) && discFromRemarks < 100) {
        // Special Price provided + Discount in remarks -> calculate Gross Price
        priceVal = Math.round(specialPriceVal / (1 - discFromRemarks / 100));
      } else if (priceVal > 0 && specialPriceVal > 0 && specialPriceVal === priceVal) {
        specialPriceVal = Math.round(priceVal * (1 - discFromRemarks / 100));
      }
    } else if (priceVal > 0 && specialPriceVal > 0 && specialPriceVal < priceVal) {
      const impliedDisc = Math.round(((priceVal - specialPriceVal) / priceVal) * 100);
      if (impliedDisc > 0 && (!remarksVal || !remarksVal.includes('%'))) {
        remarksVal = remarksVal ? `${remarksVal} (DISKON ${impliedDisc}%)` : `DISKON ${impliedDisc}%`;
      }
    } else if (priceVal > 0 && !specialPriceVal) {
      specialPriceVal = priceVal;
    } else if (specialPriceVal > 0 && !priceVal) {
      priceVal = specialPriceVal;
    }

    // Amount directly calculated from Qty * Special Price (or Price)
    const effectivePrice = specialPriceVal > 0 ? specialPriceVal : (priceVal > 0 ? priceVal : 0);
    const amountVal = jumlahVal * effectivePrice;

    const stockVal = getVal(mapping.stock);
    const leadtimeVal = getVal(mapping.estimasiLeadtime);

    return {
      id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      no: noVal,
      material: materialVal,
      itc: itcVal,
      description: descVal,
      jumlah: jumlahVal,
      unit: unitVal,
      price: priceVal,
      specialPrice: specialPriceVal,
      amount: amountVal,
      stock: stockVal,
      estimasiLeadtime: leadtimeVal,
      remarks: remarksVal
    };
  }).filter(item => item.material || item.description || item.price > 0 || item.amount > 0);

  return {
    items,
    detectedDelimiter: delimiter,
    headers,
    rawRows,
    mapping,
    hasHeaderRow: hasHeader
  };
}
