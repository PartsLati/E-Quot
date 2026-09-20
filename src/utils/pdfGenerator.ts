import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { QuotationData } from '../types';

export interface PDFExportOptions {
  fileName?: string;
  data?: QuotationData;
  onProgress?: (percent: number, statusText: string) => void;
}

/**
 * Generate PDF by capturing the exact rendered DOM elements (.a4-page)
 * Uses an isolated offscreen staging sandbox for 100% layout fidelity,
 * preventing scale distortions, missing elements, or tainted canvas errors.
 */
export async function downloadQuotationPDF(options: PDFExportOptions = {}): Promise<void> {
  const { fileName = 'E-Quotation.pdf', onProgress } = options;

  onProgress?.(10, 'Menyiapkan halaman dokumen...');

  // Find all A4 page elements in the document
  // Prefer pages from the dedicated capture area or preview area
  let pageElements = Array.from(document.querySelectorAll<HTMLElement>('.a4-page'));

  // If there are duplicate rendered pages across tabs/containers, deduplicate by ID
  const uniquePagesMap = new Map<string, HTMLElement>();
  pageElements.forEach((el, idx) => {
    const key = el.id || `page-${idx}`;
    if (!uniquePagesMap.has(key)) {
      uniquePagesMap.set(key, el);
    }
  });

  const targetPages = Array.from(uniquePagesMap.values());

  if (!targetPages || targetPages.length === 0) {
    throw new Error('Halaman dokumen penawaran tidak ditemukan.');
  }

  // Create jsPDF instance in A4 portrait format (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Create temporary sandbox behind visible UI for reliable rasterization
  const sandbox = document.createElement('div');
  sandbox.id = 'pdf-export-staging-container';
  sandbox.style.position = 'fixed';
  sandbox.style.left = '0';
  sandbox.style.top = '0';
  sandbox.style.width = '794px'; // Exactly 210mm in standard 96 DPI
  sandbox.style.minHeight = '1123px'; // Exactly 297mm in standard 96 DPI
  sandbox.style.zIndex = '-99999';
  sandbox.style.opacity = '1';
  sandbox.style.visibility = 'visible';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.margin = '0';
  sandbox.style.padding = '0';
  sandbox.style.transform = 'none';
  document.body.appendChild(sandbox);

  const totalPages = targetPages.length;

  try {
    for (let i = 0; i < totalPages; i++) {
      const pageEl = targetPages[i];
      const pageNum = i + 1;
      const progressPercent = Math.round(15 + ((i + 1) / totalPages) * 75);

      onProgress?.(progressPercent, `Memproses halaman ${pageNum} dari ${totalPages}...`);

      // Clear sandbox & clone current page
      sandbox.innerHTML = '';
      const pageClone = pageEl.cloneNode(true) as HTMLElement;

      // Reset any preview transform or scale on the clone
      pageClone.style.transform = 'none';
      pageClone.style.transformOrigin = 'top left';
      pageClone.style.width = '794px';
      pageClone.style.minHeight = '1123px';
      pageClone.style.margin = '0';
      pageClone.style.boxShadow = 'none';
      pageClone.style.backgroundColor = '#ffffff';
      pageClone.style.display = 'block';
      pageClone.style.opacity = '1';
      pageClone.style.visibility = 'visible';

      sandbox.appendChild(pageClone);

      // Brief delay to allow image rendering
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Capture cloned element with html2canvas
      const canvas = await html2canvas(pageClone, {
        scale: 2.0, // 2x scale = 1588 x 2246 px (Crisp high-DPI text & graphics)
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: Math.max(pageClone.scrollHeight, 1123),
        windowWidth: 794,
        windowHeight: 1123
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      // Add page to PDF
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Add full A4 image (210mm x 297mm)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    onProgress?.(95, 'Menyimpan file PDF...');

    // Attempt direct download via jsPDF save
    try {
      pdf.save(fileName);
    } catch (saveError) {
      console.warn('Direct pdf.save failed, trying blob download', saveError);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }

    onProgress?.(100, 'Selesai!');
  } finally {
    // Clean up sandbox
    if (document.body.contains(sandbox)) {
      document.body.removeChild(sandbox);
    }
  }
}
