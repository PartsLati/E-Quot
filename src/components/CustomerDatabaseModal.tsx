import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Check, 
  Building2, 
  Upload,
  ClipboardPaste,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  CustomerRecord, 
  getStoredCustomers, 
  addOrUpdateCustomer, 
  addBulkCustomers,
  deleteCustomerRecord, 
  clearCustomerDatabase 
} from '../data/customerDatabase';

interface CustomerDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer?: (customer: CustomerRecord) => void;
  onDatabaseUpdated?: () => void;
}

export const CustomerDatabaseModal: React.FC<CustomerDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onDatabaseUpdated
}) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>(getStoredCustomers());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'paste' | 'form'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync customers whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCustomers(getStoredCustomers());
      setSaveSuccessMsg(null);
    }
  }, [isOpen]);

  // Form State for Single Add / Edit
  const [formData, setFormData] = useState<Partial<CustomerRecord>>({
    namaPelanggan: '',
    nomorPelanggan: '',
    jenisSector: '',
    ketentuanPembayaran: 'N30',
    ketentuanPengiriman: 'TJR',
    modelSerialUnit: 'ALL'
  });

  // Paste / Parse State
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<CustomerRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filtered = customers.filter(c => 
    (c.namaPelanggan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.nomorPelanggan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.jenisSector || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Parse Raw Text from Clipboard (Tab-separated or Comma/Semicolon-separated)
  const handleParseText = (raw: string) => {
    setPastedText(raw);
    setParseError(null);
    if (!raw.trim()) {
      setParsedPreview([]);
      return;
    }

    try {
      const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setParsedPreview([]);
        return;
      }

      // Check delimiter (Tab, Semicolon, or Comma)
      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(';') && !firstLine.includes('\t')) delimiter = ';';
      else if (firstLine.includes(',') && !firstLine.includes('\t')) delimiter = ',';

      // Detect header row if present
      let startIndex = 0;
      const firstRowCols = firstLine.split(delimiter).map(s => s.trim().toLowerCase());
      const hasHeader = firstRowCols.some(col => 
        col.includes('nama') || col.includes('pelanggan') || col.includes('customer') || 
        col.includes('sector') || col.includes('top') || col.includes('bayar')
      );

      let colMap = {
        name: 0,
        code: 1,
        sector: 2,
        top: 3,
        shipping: 4,
        unit: 5
      };

      if (hasHeader) {
        startIndex = 1;
        firstRowCols.forEach((col, idx) => {
          if (col.includes('nama') || col.includes('customer') || col.includes('perusahaan') || col.includes('client')) colMap.name = idx;
          else if (col.includes('nomor') || col.includes('no.') || col.includes('code') || col.includes('kode') || col.includes('id')) colMap.code = idx;
          else if (col.includes('sector') || col.includes('sektor') || col.includes('bisnis') || col.includes('industry')) colMap.sector = idx;
          else if (col.includes('pembayaran') || col.includes('top') || col.includes('term') || col.includes('payment')) colMap.top = idx;
          else if (col.includes('pengiriman') || col.includes('delivery') || col.includes('kirim') || col.includes('loc')) colMap.shipping = idx;
          else if (col.includes('unit') || col.includes('model') || col.includes('serial')) colMap.unit = idx;
        });
      }

      const results: CustomerRecord[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length === 0 || !cols[colMap.name]) continue;

        const custName = cols[colMap.name] || '';
        if (!custName) continue;

        const rawSector = colMap.sector !== -1 && cols[colMap.sector] !== undefined ? cols[colMap.sector].trim() : '';
        const rawTop = colMap.top !== -1 && cols[colMap.top] !== undefined ? cols[colMap.top].trim() : '';
        const rawShipping = colMap.shipping !== -1 && cols[colMap.shipping] !== undefined ? cols[colMap.shipping].trim() : '';
        const rawUnit = colMap.unit !== -1 && cols[colMap.unit] !== undefined ? cols[colMap.unit].trim() : '';

        results.push({
          id: `cust-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          namaPelanggan: custName.toUpperCase(),
          nomorPelanggan: (colMap.code !== -1 && cols[colMap.code] !== undefined ? cols[colMap.code] : '').trim(),
          jenisSector: rawSector.toUpperCase(),
          ketentuanPembayaran: rawTop.toUpperCase(),
          ketentuanPengiriman: rawShipping ? rawShipping.toUpperCase() : 'TJR',
          modelSerialUnit: rawUnit || 'ALL'
        });
      }

      setParsedPreview(results);
    } catch (err: any) {
      setParseError('Gagal memproses format teks. Pastikan data berasal dari baris tabel Excel / Sheet.');
    }
  };

  // Handle Excel (.xlsx, .xls, .csv) File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON array
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!rawJson || rawJson.length === 0) {
          alert('File sheet kosong.');
          return;
        }

        // Detect column indexes from first row
        const headerRow: string[] = (rawJson[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
        
        let colMap = {
          name: -1,
          code: -1,
          sector: -1,
          top: -1,
          shipping: -1,
          unit: -1
        };

        headerRow.forEach((h, idx) => {
          if (h.includes('nama') || h.includes('customer') || h.includes('perusahaan') || h.includes('client')) colMap.name = idx;
          else if (h.includes('nomor') || h.includes('no') || h.includes('code') || h.includes('kode') || h.includes('id')) colMap.code = idx;
          else if (h.includes('sector') || h.includes('sektor') || h.includes('bisnis') || h.includes('industry')) colMap.sector = idx;
          else if (h.includes('pembayaran') || h.includes('top') || h.includes('term') || h.includes('payment')) colMap.top = idx;
          else if (h.includes('pengiriman') || h.includes('delivery') || h.includes('kirim')) colMap.shipping = idx;
          else if (h.includes('unit') || h.includes('model') || h.includes('serial')) colMap.unit = idx;
        });

        // Fallback default columns if no header found
        if (colMap.name === -1) colMap.name = 0;
        if (colMap.code === -1) colMap.code = 1;
        if (colMap.sector === -1) colMap.sector = 2;
        if (colMap.top === -1) colMap.top = 3;
        if (colMap.shipping === -1) colMap.shipping = 4;
        if (colMap.unit === -1) colMap.unit = 5;

        const imported: CustomerRecord[] = [];
        const startRow = (colMap.name === 0 && headerRow[0]?.includes('nama')) ? 1 : 0;

        for (let r = startRow; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || !row[colMap.name]) continue;

          const custName = String(row[colMap.name] || '').trim();
          if (!custName) continue;

          const rawSector = colMap.sector !== -1 && row[colMap.sector] !== undefined && row[colMap.sector] !== null ? String(row[colMap.sector]).trim() : '';
          const rawTop = colMap.top !== -1 && row[colMap.top] !== undefined && row[colMap.top] !== null ? String(row[colMap.top]).trim() : '';
          const rawShipping = colMap.shipping !== -1 && row[colMap.shipping] !== undefined && row[colMap.shipping] !== null ? String(row[colMap.shipping]).trim() : '';
          const rawUnit = colMap.unit !== -1 && row[colMap.unit] !== undefined && row[colMap.unit] !== null ? String(row[colMap.unit]).trim() : '';

          imported.push({
            id: `cust-${Date.now()}-${r}-${Math.random().toString(36).substr(2, 4)}`,
            namaPelanggan: custName.toUpperCase(),
            nomorPelanggan: String(colMap.code !== -1 && row[colMap.code] !== undefined && row[colMap.code] !== null ? row[colMap.code] : '').trim(),
            jenisSector: rawSector.toUpperCase(),
            ketentuanPembayaran: rawTop ? rawTop.toUpperCase() : 'N30',
            ketentuanPengiriman: rawShipping ? rawShipping.toUpperCase() : 'TJR',
            modelSerialUnit: rawUnit || 'ALL'
          });
        }

        if (imported.length > 0) {
          const updated = addBulkCustomers(imported);
          setCustomers(updated);
          onDatabaseUpdated?.();
          setViewMode('list');
          alert(`Berhasil mengimpor ${imported.length} data pelanggan dari file Excel!`);
        } else {
          alert('Tidak ada data pelanggan yang dapat dibaca dari file tersebut.');
        }
      } catch (err: any) {
        console.error('Error importing sheet', err);
        alert('Gagal membaca file Excel/CSV: ' + (err.message || 'Format tidak didukung'));
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Pelanggan': 'PT MADHANI TALATAH NUSANTARA',
        'Nomor Pelanggan': '1002341',
        'Jenis Sector': 'MINING',
        'Ketentuan Pembayaran': 'N30',
        'Ketentuan Pengiriman': 'TJR',
        'Model Serial Unit': 'ALL'
      },
      {
        'Nama Pelanggan': 'PT BARA TAMA WIJAYA',
        'Nomor Pelanggan': '1004812',
        'Jenis Sector': 'MINING',
        'Ketentuan Pembayaran': 'N30',
        'Ketentuan Pengiriman': 'TJR',
        'Model Serial Unit': 'ALL'
      },
      {
        'Nama Pelanggan': 'PT BERAU COAL',
        'Nomor Pelanggan': '1001098',
        'Jenis Sector': 'MINING',
        'Ketentuan Pembayaran': 'N45',
        'Ketentuan Pengiriman': 'TJR',
        'Model Serial Unit': 'ALL'
      },
      {
        'Nama Pelanggan': 'Ronny',
        'Nomor Pelanggan': '9000101',
        'Jenis Sector': 'GENERAL',
        'Ketentuan Pembayaran': 'COD',
        'Ketentuan Pengiriman': 'TJR',
        'Model Serial Unit': 'ALL'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Pelanggan');
    XLSX.writeFile(wb, 'Template_Database_Pelanggan_UT.xlsx');
  };

  const handleApplyPasted = () => {
    if (parsedPreview.length === 0) return;
    const updated = addBulkCustomers(parsedPreview);
    setCustomers(updated);
    onDatabaseUpdated?.();
    setPastedText('');
    setParsedPreview([]);
    setViewMode('list');
  };

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPelanggan?.trim()) return;

    const newRecord: CustomerRecord = {
      id: selectedId || formData.id || `cust-${Date.now()}`,
      namaPelanggan: formData.namaPelanggan.trim().toUpperCase(),
      nomorPelanggan: (formData.nomorPelanggan || '').trim(),
      jenisSector: (formData.jenisSector || '').trim().toUpperCase(),
      ketentuanPembayaran: (formData.ketentuanPembayaran || 'N30').trim().toUpperCase(),
      ketentuanPengiriman: (formData.ketentuanPengiriman || 'TJR').trim().toUpperCase(),
      modelSerialUnit: formData.modelSerialUnit || 'ALL'
    };

    const updated = addOrUpdateCustomer(newRecord);
    setCustomers(updated);
    setSaveSuccessMsg(`Data pelanggan "${newRecord.namaPelanggan}" berhasil disimpan!`);
    setSelectedId(null);
    setFormData({
      namaPelanggan: '',
      nomorPelanggan: '',
      jenisSector: '',
      ketentuanPembayaran: 'N30',
      ketentuanPengiriman: 'TJR',
      modelSerialUnit: 'ALL'
    });
    setViewMode('list');
    onDatabaseUpdated?.();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus data pelanggan ini dari database?')) {
      const updated = deleteCustomerRecord(id);
      setCustomers(updated);
      onDatabaseUpdated?.();
    }
  };

  const handleClearAll = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan seluruh database pelanggan?')) {
      const updated = clearCustomerDatabase();
      setCustomers(updated);
      onDatabaseUpdated?.();
    }
  };

  const handlePick = (customer: CustomerRecord) => {
    onSelectCustomer?.(customer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-950 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Database Master Pelanggan</h3>
              <p className="text-xs text-slate-400">
                Input melalui upload file Excel/CSV atau copy-paste data sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Top Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
              }`}
            >
              Daftar Database ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('paste')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'paste' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste / Parse Data Sheet
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setFormData({
                  namaPelanggan: '',
                  nomorPelanggan: '',
                  jenisSector: '',
                  ketentuanPembayaran: 'N30',
                  ketentuanPengiriman: 'TJR',
                  modelSerialUnit: 'ALL'
                });
                setViewMode('form');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'form' 
                  ? 'bg-amber-500 text-slate-950 shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Manual
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Hidden File Input for Excel/CSV */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Excel / CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              title="Download contoh format Excel"
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Template Excel</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ================= VIEW 1: PASTE / PARSE SHEET ================= */}
          {viewMode === 'paste' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 rounded-xl">
                <h4 className="text-xs font-bold text-slate-900 dark:text-amber-300 flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Copy & Paste Baris Data dari Excel / Google Sheets
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Blok baris tabel di Excel Anda (Nama Pelanggan, Nomor Pelanggan, Sector, TOP), lalu tekan <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px]">Ctrl+C</kbd> dan paste di bawah ini.
                </p>
              </div>

              <div>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => handleParseText(e.target.value)}
                  placeholder={`Contoh data yang di-paste:\nPT MADHANI TALATAH NUSANTARA\t1002341\tMINING\tN30\nPT BARA TAMA WIJAYA\t1004812\tMINING\tN30\nPT BERAU COAL\t1001098\tMINING\tN45\nRonny\t9000101\tGENERAL\tCOD`}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              {parseError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview Parsed Items */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Terdeteksi {parsedPreview.length} Data Pelanggan Siap Diimpor
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyPasted}
                      className="px-4 py-1.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                      Impor ke Database Master
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Nama Pelanggan</th>
                          <th className="p-2">No. Pelanggan</th>
                          <th className="p-2">Sector</th>
                          <th className="p-2">TOP</th>
                          <th className="p-2">Pengiriman</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{item.namaPelanggan}</td>
                            <td className="p-2 font-mono text-slate-600 dark:text-slate-400">{item.nomorPelanggan || '-'}</td>
                            <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">{item.jenisSector}</td>
                            <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">{item.ketentuanPembayaran}</td>
                            <td className="p-2 text-slate-500 dark:text-slate-400">{item.ketentuanPengiriman}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW 2: FORM ADD / EDIT ================= */}
          {viewMode === 'form' && (
            <form onSubmit={handleSaveSingle} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {selectedId ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Kembali ke Daftar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pelanggan / Perusahaan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaPelanggan || ''}
                    onChange={(e) => setFormData({ ...formData, namaPelanggan: e.target.value })}
                    placeholder="Contoh: PT MADHANI TALATAH NUSANTARA"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Pelanggan (Customer Code)
                  </label>
                  <input
                    type="text"
                    value={formData.nomorPelanggan || ''}
                    onChange={(e) => setFormData({ ...formData, nomorPelanggan: e.target.value })}
                    placeholder="Contoh: 1002341"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Sector
                  </label>
                  <input
                    type="text"
                    value={formData.jenisSector || ''}
                    onChange={(e) => setFormData({ ...formData, jenisSector: e.target.value })}
                    placeholder="Contoh: MINING, FORESTRY, AGRO"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 uppercase font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ketentuan Pembayaran (TOP)
                  </label>
                  <input
                    type="text"
                    value={formData.ketentuanPembayaran || ''}
                    onChange={(e) => setFormData({ ...formData, ketentuanPembayaran: e.target.value })}
                    placeholder="Contoh: N30, N45, COD"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 uppercase font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ketentuan Pengiriman
                  </label>
                  <input
                    type="text"
                    value={formData.ketentuanPengiriman || ''}
                    onChange={(e) => setFormData({ ...formData, ketentuanPengiriman: e.target.value })}
                    placeholder="Contoh: TJR"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 uppercase font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-amber-600 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW 3: LIST TABLE ================= */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-2 text-emerald-800 dark:text-emerald-200 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveSuccessMsg(null)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Search Bar & Clear Action */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama pelanggan, nomor pelanggan, atau sector..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                  />
                </div>
                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    title="Kosongkan seluruh database pelanggan"
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>

              {/* Table / Empty State */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                {customers.length === 0 ? (
                  <div className="p-10 text-center space-y-4 bg-white dark:bg-slate-900">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Database Pelanggan Masih Kosong</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Silakan input data pelanggan Anda dengan mengupload file Excel/CSV atau copy-paste langsung dari spreadsheet.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        Upload File Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('paste')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ClipboardPaste className="w-4 h-4" />
                        Paste dari Sheet
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Nama Pelanggan</th>
                        <th className="p-3">No. Pelanggan</th>
                        <th className="p-3">Sector</th>
                        <th className="p-3">TOP</th>
                        <th className="p-3 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500 italic">
                            Tidak ada pelanggan yang cocok dengan pencarian "{searchQuery}".
                          </td>
                        </tr>
                      ) : (
                        filtered.map((customer) => (
                          <tr
                            key={customer.id}
                            onClick={() => handlePick(customer)}
                            className="hover:bg-amber-50/50 dark:hover:bg-slate-800/70 cursor-pointer transition-colors group"
                          >
                            <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                              {customer.namaPelanggan}
                            </td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                              {customer.nomorPelanggan || '-'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded text-[10px]">
                                {customer.jenisSector || '-'}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                              {customer.ketentuanPembayaran || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handlePick(customer)}
                                  title="Gunakan pelanggan ini"
                                  className="px-2 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 rounded font-semibold text-[10px] cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900"
                                >
                                  Pilih
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedId(customer.id);
                                    setFormData({ ...customer });
                                    setViewMode('form');
                                  }}
                                  title="Edit data"
                                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(customer.id, e)}
                                  title="Hapus"
                                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Total Tersimpan: {customers.length} Pelanggan</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
