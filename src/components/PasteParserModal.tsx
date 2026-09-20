import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ClipboardPaste, 
  Sparkles, 
  Table, 
  Check, 
  AlertCircle, 
  Settings2, 
  RefreshCw, 
  FileText,
  ChevronDown
} from 'lucide-react';
import { QuotationItem, ColumnMapping } from '../types';
import { parseRawPastedText, detectDelimiter, inferColumnMapping } from '../utils/parser';
import { formatIDR } from '../utils/numberFormat';

interface PasteParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyItems: (items: QuotationItem[], appendMode: boolean) => void;
}

const FIELD_LABELS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: 'no', label: 'No' },
  { key: 'material', label: 'Material / Part No', required: true },
  { key: 'itc', label: 'ITC' },
  { key: 'description', label: 'Description / Nama Barang', required: true },
  { key: 'jumlah', label: 'Jumlah / Qty' },
  { key: 'unit', label: 'Unit' },
  { key: 'price', label: 'Price (Gross)' },
  { key: 'specialPrice', label: 'Special Price (Net)' },
  { key: 'amount', label: 'Amount (Total)' },
  { key: 'stock', label: 'Stock (TMD/AVL)' },
  { key: 'estimasiLeadtime', label: 'Estimasi Leadtime' },
  { key: 'remarks', label: 'Remarks / Diskon' }
];

export const PasteParserModal: React.FC<PasteParserModalProps> = ({
  isOpen,
  onClose,
  onApplyItems
}) => {
  const [pastedText, setPastedText] = useState('');
  const [selectedDelimiter, setSelectedDelimiter] = useState<string>('auto');
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [appendMode, setAppendMode] = useState<boolean>(false);
  const [showMappingSettings, setShowMappingSettings] = useState<boolean>(false);
  const [customMapping, setCustomMapping] = useState<ColumnMapping | null>(null);

  // When opening or changing text, run parse
  const actualDelimiter = useMemo(() => {
    if (selectedDelimiter === 'auto') {
      return detectDelimiter(pastedText);
    }
    return selectedDelimiter;
  }, [pastedText, selectedDelimiter]);

  const parsedResult = useMemo(() => {
    return parseRawPastedText(
      pastedText,
      actualDelimiter,
      customMapping || undefined
    );
  }, [pastedText, actualDelimiter, customMapping]);

  // Reset custom mapping when new text pasted
  const handleTextChange = (text: string) => {
    setPastedText(text);
    setCustomMapping(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleTextChange(text);
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, columnIndex: number) => {
    const base = customMapping || parsedResult.mapping;
    setCustomMapping({
      ...base,
      [field]: columnIndex
    });
  };

  const handleApply = () => {
    if (parsedResult.items.length === 0) return;
    onApplyItems(parsedResult.items, appendMode);
    onClose();
  };

  if (!isOpen) return null;

  const totalCalculated = parsedResult.items.reduce((s, i) => s + (i.amount || i.jumlah * (i.specialPrice || i.price || 0)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Paste & Parse Kolom Suku Cadang
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Auto-Detect Format
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Copy tabel dari Excel, Google Sheets, TSV, CSV, SAP, atau pesan teks lalu paste di bawah.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Petunjuk:</span> Salin baris tabel dari Excel / Google Sheets lalu klik tombol di samping atau tekan <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">Ctrl+V</kbd>.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste dari Clipboard
              </button>
              {pastedText && (
                <button
                  type="button"
                  onClick={() => handleTextChange('')}
                  className="px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>
          </div>

          {/* Paste Input Area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Area Input Teks Paste:
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {pastedText ? `${pastedText.split(/\r?\n/).filter(Boolean).length} baris terdeteksi` : 'Siap menerima teks'}
              </span>
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste data tabel di sini (Ctrl+V)&#10;Contoh format Tab/Excel:&#10;10&#9;2357653&#9;&#9;HOSE ASSEM&#9;1&#9;PC&#9;3.717.400&#9;2.788.050&#9;2.788.050&#9;TMD&#9;7 Hari&#9;DISKON 25%"
              rows={5}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-y"
            />
          </div>

          {/* Parsing Options & Delimiter Settings */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-100/70 dark:bg-slate-800/80 rounded-xl text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Pemisah Kolom:</span>
                <select
                  value={selectedDelimiter}
                  onChange={(e) => setSelectedDelimiter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-2.5 py-1 text-xs font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="auto">Otomatis ({actualDelimiter === '\t' ? 'Tab' : actualDelimiter === ';' ? 'Semicolon (;)' : actualDelimiter === '|' ? 'Pipe (|)' : actualDelimiter === ',' ? 'Koma (,)' : 'Spasi'})</option>
                  <option value="&#9;">Tab (Excel / Google Sheets)</option>
                  <option value=";">Titik Koma ( ; )</option>
                  <option value="|">Garis Vertikal ( | )</option>
                  <option value=",">Koma ( , )</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowMappingSettings(!showMappingSettings)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                  showMappingSettings 
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Atur Pemetaan Kolom
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMappingSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={appendMode}
                  onChange={(e) => setAppendMode(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Tambahkan ke item yang ada (Append)</span>
              </label>
            </div>
          </div>

          {/* Column Mapping Configuration Drawer */}
          {showMappingSettings && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Konfigurasi Kolom Target vs Kolom Sumber
                </h4>
                <button
                  type="button"
                  onClick={() => setCustomMapping(null)}
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset ke Rekomendasi Otomatis
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {FIELD_LABELS.map(({ key, label, required }) => {
                  const currentIdx = (customMapping || parsedResult.mapping)[key];
                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{label} {required && <span className="text-rose-500">*</span>}</span>
                      </label>
                      <select
                        value={currentIdx}
                        onChange={(e) => handleMappingChange(key, parseInt(e.target.value))}
                        className={`w-full text-xs rounded-lg border p-1.5 ${
                          currentIdx !== -1 
                            ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 font-medium text-slate-900 dark:text-slate-100' 
                            : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <option value={-1}>-- Abaikan / Kosong --</option>
                        {parsedResult.headers.map((h, idx) => (
                          <option key={idx} value={idx}>
                            Kolom {idx + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Preview Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Hasil Parse ({parsedResult.items.length} Item)
                </h3>
              </div>
              {parsedResult.items.length > 0 && (
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Total Nilai: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">Rp {formatIDR(totalCalculated)}</span>
                </div>
              )}
            </div>

            {parsedResult.items.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs">
                  Belum ada data yang di-parse. Silakan paste teks tabel atau klik tombol contoh di atas.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2 text-center w-10">No</th>
                        <th className="p-2 text-center">Material</th>
                        <th className="p-2 text-center">ITC</th>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-center">Unit</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-right">Special Price</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center">Stock</th>
                        <th className="p-2 text-center">Leadtime</th>
                        <th className="p-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11.5px]">
                      {parsedResult.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-2 text-center font-sans font-medium text-slate-500 dark:text-slate-400">{item.no}</td>
                          <td className="p-2 text-center font-bold text-slate-800 dark:text-slate-100">{item.material}</td>
                          <td className="p-2 text-center text-slate-600 dark:text-slate-300">{item.itc || '-'}</td>
                          <td className="p-2 font-sans uppercase font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                          <td className="p-2 text-center font-sans dark:text-slate-300">{item.jumlah}</td>
                          <td className="p-2 text-center font-sans dark:text-slate-300">{item.unit}</td>
                          <td className="p-2 text-right text-slate-600 dark:text-slate-400">{item.price ? formatIDR(item.price) : '-'}</td>
                          <td className="p-2 text-right font-bold text-slate-900 dark:text-amber-400">{formatIDR(item.specialPrice || item.price)}</td>
                          <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatIDR(item.amount || item.jumlah * (item.specialPrice || item.price || 0))}
                          </td>
                          <td className="p-2 text-center text-slate-700 dark:text-slate-300">{item.stock}</td>
                          <td className="p-2 text-center text-slate-700 dark:text-slate-300 font-sans">{item.estimasiLeadtime}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400 font-sans text-[11px]">{item.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={parsedResult.items.length === 0}
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Terapkan {parsedResult.items.length} Item ke E-Quotation
          </button>
        </div>
      </div>
    </div>
  );
};
