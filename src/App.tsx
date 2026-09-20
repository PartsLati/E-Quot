import React, { useState } from 'react';
import { QuotationData, QuotationItem } from './types';
import { SAMPLE_QUOTATION_DATA } from './data/defaultData';
import { generateIdQuotation } from './utils/quotationHelper';
import { HeaderNavbar } from './components/HeaderNavbar';
import { QuotationForm } from './components/QuotationForm';
import { ItemsTableEditor } from './components/ItemsTableEditor';
import { PDFPreview } from './components/PDFPreview';
import { PasteParserModal } from './components/PasteParserModal';

const STORAGE_KEY = 'equot_ut_data_v4';

export default function App() {
  // Load saved state or default sample
  const [data, setData] = useState<QuotationData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('equot_ut_data_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged: QuotationData = {
          ...SAMPLE_QUOTATION_DATA,
          ...parsed,
          nomorQuotation: parsed.nomorQuotation || '1',
          idPembuatDokumen: parsed.idPembuatDokumen || 'TJRCOP1',
        };
        if (!merged.idQuotation || merged.idQuotation.includes('BTW-2708261')) {
          merged.idQuotation = generateIdQuotation(
            merged.nomorQuotation || '1',
            merged.idPembuatDokumen || 'TJRCOP1',
            merged.tanggal || new Date().toISOString().split('T')[0]
          );
        }
        return merged;
      }
    } catch (e) {
      console.warn('Failed to read saved data', e);
    }
    return SAMPLE_QUOTATION_DATA;
  });

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

  // Auto-save data
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to auto-save data', e);
    }
  }, [data]);

  // Handle pasted table items
  const handleApplyPastedItems = (newItems: QuotationItem[]) => {
    setData(prev => {
      let nextItems = [...newItems];
      if (prev.diskonGrosirAktif && prev.persentaseDiskonGrosir > 0) {
        const pct = prev.persentaseDiskonGrosir;
        nextItems = nextItems.map(item => {
          const basePrice = item.price || 0;
          const discountedUnit = Math.round(basePrice * (1 - pct / 100));
          return {
            ...item,
            specialPrice: discountedUnit,
            amount: discountedUnit * item.jumlah
          };
        });
      }
      return {
        ...prev,
        items: nextItems
      };
    });
  };

  const handleItemsChange = (items: QuotationItem[]) => {
    setData(prev => ({
      ...prev,
      items
    }));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-amber-200">
      {/* Header Navigation Bar */}
      <HeaderNavbar
        data={data}
        onLoadData={(newData) => setData(newData)}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        zoomScale={zoomScale}
        onChangeZoom={setZoomScale}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 overflow-hidden print:p-0 print:m-0 print:overflow-visible">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start h-full">
            {/* Left Side: Form & Items Editor */}
            <div className="xl:col-span-6 2xl:col-span-6 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)] pr-2 pb-16 no-print">
              <QuotationForm data={data} onChange={setData} />
              <ItemsTableEditor
                items={data.items}
                onChange={handleItemsChange}
                onOpenPasteModal={() => setIsPasteModalOpen(true)}
              />
            </div>

            {/* Right Side: Live A4 PDF Preview */}
            <div className="xl:col-span-6 2xl:col-span-6 bg-slate-200/70 border border-slate-300/70 rounded-2xl p-4 overflow-y-auto max-h-[calc(100vh-100px)] flex flex-col items-center shadow-inner print:p-0 print:bg-transparent print:border-none print:shadow-none">
              <div className="w-full flex items-center justify-between px-2 mb-3 text-xs text-slate-600 font-medium no-print">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Preview Standar United Tractors</span>
                </span>
                <span>Ukuran Kertas: A4 (210 x 297 mm)</span>
              </div>

              <div className="w-full flex justify-center print:block">
                <PDFPreview data={data} scale={zoomScale} />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'edit' && (
          <div className="max-w-5xl mx-auto space-y-6 pb-16">
            <div className="no-print space-y-6">
              <QuotationForm data={data} onChange={setData} />
              <ItemsTableEditor
                items={data.items}
                onChange={handleItemsChange}
                onOpenPasteModal={() => setIsPasteModalOpen(true)}
              />
            </div>
            {/* Clean background container for PDF generator and print */}
            <div className="fixed -left-[9999px] top-0 pointer-events-none z-[-9999] opacity-100 bg-white print:static print:left-auto print:top-auto print:z-auto print:pointer-events-auto print:opacity-100 print:block" aria-hidden="true">
              <PDFPreview data={data} scale={1} />
            </div>
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="bg-slate-200/70 border border-slate-300/70 rounded-2xl p-6 min-h-[calc(100vh-120px)] flex flex-col items-center shadow-inner overflow-y-auto pb-16 print:p-0 print:bg-transparent print:border-none print:shadow-none">
            <div className="max-w-4xl w-full flex items-center justify-between px-2 mb-4 text-xs text-slate-600 font-medium no-print">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Preview E-Quotation A4</span>
              </span>
              <span>Zoom: {Math.round(zoomScale * 100)}%</span>
            </div>

            <div className="print:block">
              <PDFPreview data={data} scale={zoomScale} />
            </div>
          </div>
        )}
      </main>

      {/* Modal for Copy-Paste Column Parsing */}
      <PasteParserModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApplyItems={handleApplyPastedItems}
      />
    </div>
  );
}
