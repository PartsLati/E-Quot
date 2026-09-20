/**
 * Format a number into standard Indonesian thousand separated string: 2.788.050
 */
export function formatIDR(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'number' ? value : parseNumber(value);
  if (isNaN(num)) return '0';
  
  // Format with period as thousand separator, integer rupiah
  const rounded = Math.round(num);
  return rounded.toLocaleString('id-ID');
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  // Check if already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Parse any string containing currency, dots, commas, or spaces into a number
 */
export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  
  let str = String(val).trim();
  // Remove currency prefixes like Rp, IDR, $, etc.
  str = str.replace(/^(Rp\.?|IDR|\$)\s*/i, '');
  str = str.replace(/\s+/g, '');

  if (!str) return 0;

  // Trim trailing Indonesian or standard zero decimals like ",00" or ".00"
  str = str.replace(/[,.]00$/, '');

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Indonesian: 1.234.567,50 -> remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // English: 1,234,567.50 -> remove commas
      str = str.replace(/,/g, '');
    }
  } else if (lastDot !== -1 && lastComma === -1) {
    // Only dots: In Indonesian context, dots in prices are thousand separators
    // e.g. "1.000", "2.788.050", "500.000", "5.0000" -> remove dots
    str = str.replace(/\./g, '');
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only commas
    const commaParts = str.split(',');
    if (commaParts.length > 2) {
      str = str.replace(/,/g, '');
    } else if (commaParts.length === 2) {
      if (commaParts[1].length === 3) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(',', '.');
      }
    }
  }

  // Remove any remaining non-digit non-dot non-minus characters
  str = str.replace(/[^0-9.-]/g, '');

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract numeric discount percent from remarks or text (e.g. "PRICE NON SCPL DISC 20%", "DISKON 25%", "DISC 25%", "25%", "DISKON: 25.5%")
 */
export function extractDiscountPercent(remarks: string | undefined | null): number | null {
  if (!remarks) return null;
  
  // 1. Explicit keyword match: "DISC 20%", "DISKON 25%", "DISCOUNT 15%", "DISC. 20%", "POTONGAN 10%"
  const matchWithKeyword = remarks.match(/(?:DISKON|DISCOUNT|DISC|POTONGAN)[\s.:=-]*(\d+(?:[.,]\d+)?)\s*%/i) ||
                           remarks.match(/(?:DISKON|DISCOUNT|DISC|POTONGAN)[\s.:=-]+(\d+(?:[.,]\d+)?)(?!\w)/i);
  if (matchWithKeyword) {
    const val = parseFloat(matchWithKeyword[1].replace(',', '.'));
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }

  // 2. Standalone percentage e.g. "20%" or "(20%)" or "25.5%"
  const matchPercentOnly = remarks.match(/(?:^|\s|\()(\d+(?:[.,]\d+)?)\s*%/i);
  if (matchPercentOnly) {
    const val = parseFloat(matchPercentOnly[1].replace(',', '.'));
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }

  return null;
}
