/**
 * Utility functions for Quotation ID generation, Customer initials, and Date codes.
 */

/**
 * Get 6-digit date code in DDMMYY format
 * E.g. "27/08/2026" -> "270826"
 */
export function getDateCode(tanggalStr?: string): string {
  if (tanggalStr) {
    const clean = tanggalStr.trim();
    // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3].slice(-2);
      return `${day}${month}${year}`;
    }
    // Check if digits only
    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length === 6) {
      return digitsOnly;
    } else if (digitsOnly.length === 8) {
      return digitsOnly.slice(0, 4) + digitsOnly.slice(6, 8);
    }
  }

  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

/**
 * Extract customer acronym or keep single word
 * - "Madhani Talatah Nusantara" -> "MTN"
 * - "BARA TAMA WIJAYA" -> "BTW"
 * - "Ronny" -> "Ronny"
 */
export function getCustomerCode(namaPelanggan?: string): string {
  if (!namaPelanggan || !namaPelanggan.trim()) {
    return 'CUSTOMER';
  }

  const clean = namaPelanggan.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return 'CUSTOMER';
  if (words.length === 1) return words[0]; // If 1 word, keep that word (e.g. "Ronny")
  
  // If multiple words, take the first letter of each word in uppercase
  return words.map(w => w[0].toUpperCase()).join('');
}

/**
 * Valid Creator IDs (ID Pembuat Dokumen)
 */
export const VALID_CREATOR_IDS = ['TJRCOP1', 'TJRCOP2', 'TJRCOP3'] as const;
export type CreatorId = typeof VALID_CREATOR_IDS[number];

/**
 * Generate standard ID Quotation (RFQ)
 * Format: RFQ-[CustomerCode]-[DateCode]-[CreatorID]-[QuotationNumber]
 * Example: RFQ-MTN-270826-TJRCOP3-1
 */
export function generateIdQuotation(
  namaPelanggan?: string,
  tanggal?: string,
  idPembuatDokumen?: string,
  nomorQuotation?: string
): string {
  const custCode = getCustomerCode(namaPelanggan);
  const dateCode = getDateCode(tanggal);
  const creatorId = (idPembuatDokumen && idPembuatDokumen.trim()) ? idPembuatDokumen.trim().toUpperCase() : 'TJRCOP1';
  const quoteNum = (nomorQuotation && nomorQuotation.trim()) ? nomorQuotation.trim() : '1';

  return `RFQ-${custCode}-${dateCode}-${creatorId}-${quoteNum}`;
}
