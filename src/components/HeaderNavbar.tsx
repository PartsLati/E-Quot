import React, { useState } from 'react';
import { 
  Download, 
  ClipboardPaste, 
  Columns, 
  Edit3, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Loader2
} from 'lucide-react';
import { UTLogo } from './UTLogo';
import { QuotationData } from '../types';
import { downloadQuotationPDF } from '../utils/pdfGenerator';
import { formatIDR } from '../utils/numberFormat';
import confetti from 'canvas-confetti';

interface HeaderNavbarProps {
  data: QuotationData;
  onLoadData?: (data: QuotationData) => void;
  onOpenPasteModal: () => void;
  viewMode: 'split' | 'edit' | 'preview';
  onChangeViewMode: (mode: 'split' | 'edit' | 'preview') => void;
  zoomScale: number;
  onChangeZoom: (scale: number) => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  data,
  onOpenPasteModal,
  viewMode,
  onChangeViewMode,
  zoomScale,
  onChangeZoom,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  const totalSebelumPajak = data.items.reduce(
    (sum, item) => sum + (item.amount || (item.jumlah * (item.specialPrice || item.price || 0))),
    0
  );

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      // Format file name based on ID Quotation
      const cleanId = (data.idQuotation || 'RFQ-Quotation').replace(/[/\\?%*:|"<>]/g, '-').trim();
      const fileName = `${cleanId}.pdf`;
      
      await downloadQuotationPDF({
        fileName,
        data,
        onProgress: (status) => setExportStatus(status)
      });

      // Celebration effect upon successful download
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.1, x: 0.9 },
          colors: ['#FFCC00', '#000000', '#2563EB']
        });
      } catch (e) {}
    } catch (err: any) {
      console.error('Download error:', err);
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const handleZoom = (delta: number) => {
    const next = Math.min(1.5, Math.max(0.5, Math.round((zoomScale + delta) * 10) / 10));
    onChangeZoom(next);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      <div className="max-w-[1700px] mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 flex-nowrap overflow-x-auto">
        
        {/* Left: United Tractors Official Branding & App Title */}
        <div className="flex items-center gap-3.5 shrink-0 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <UTLogo size="sm" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none whitespace-nowrap">
                E-Quotation System
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Unified View Mode & Zoom Controls Pill */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-xs shrink-0 whitespace-nowrap">
          {/* Split View */}
          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'split'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tampilan Form dan Live Preview Berdampingan"
          >
            <Columns className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="whitespace-nowrap">Split View</span>
          </button>

          {/* Form & Tabel */}
          <button
            type="button"
            onClick={() => onChangeViewMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'edit'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Fokus Pengisian Form & Tabel Suku Cadang"
          >
            <Edit3 className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="whitespace-nowrap">Form & Tabel</span>
          </button>

          {/* PDF Preview */}
          <button
            type="button"
            onClick={() => onChangeViewMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'preview'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Fokus Tinjauan Lembar Dokumen A4"
          >
            <Eye className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="whitespace-nowrap">PDF Preview</span>
          </button>

          {/* Vertical Separator Divider */}
          <div className="h-5 w-px bg-slate-300 mx-1 shrink-0" />

          {/* Zoom Controls inside the same pill */}
          <div className="flex items-center gap-0.5 px-1 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 shrink-0" />
            </button>
            <span className="font-mono text-xs font-semibold px-1.5 text-slate-700 min-w-[38px] text-center select-none whitespace-nowrap">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          {/* Quick Subtotal Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs shrink-0 whitespace-nowrap">
            <span className="text-slate-500 font-medium whitespace-nowrap">{data.items.length} Item</span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-slate-800 font-mono whitespace-nowrap">Rp {formatIDR(totalSebelumPajak)}</span>
          </div>

          {/* Paste / Parse Button */}
          <button
            type="button"
            onClick={onOpenPasteModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
          >
            <ClipboardPaste className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="whitespace-nowrap">Paste Tabel</span>
          </button>

          {/* Export PDF Download */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">{exportStatus || 'Memproses PDF...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
