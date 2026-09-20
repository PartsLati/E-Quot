import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  FileText, 
  CreditCard, 
  ShieldCheck, 
  RotateCcw,
  Database,
  Plus,
  CheckCircle2,
  BookmarkPlus,
  Upload,
  ClipboardPaste
} from 'lucide-react';
import { QuotationData } from '../types';
import { SAMPLE_QUOTATION_DATA } from '../data/defaultData';
import { generateIdQuotation, VALID_CREATOR_IDS } from '../utils/quotationHelper';
import { 
  CustomerRecord, 
  getStoredCustomers, 
  addOrUpdateCustomer 
} from '../data/customerDatabase';
import { CustomerDatabaseModal } from './CustomerDatabaseModal';

interface QuotationFormProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'customer' | 'terms' | 'signer'>('info');
  const [customerList, setCustomerList] = useState<CustomerRecord[]>(getStoredCustomers());
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync customer list from storage
  const refreshCustomerList = () => {
    setCustomerList(getStoredCustomers());
  };

  useEffect(() => {
    refreshCustomerList();
  }, []);

  // Determine current matched customer from DB (if any)
  const currentMatchedCustomer = customerList.find(
    c => c.namaPelanggan.trim().toLowerCase() === (data.namaPelanggan || '').trim().toLowerCase()
  );

  const handleSelectCustomerFromDb = (customerId: string) => {
    if (customerId === 'CUSTOM') {
      // User chose custom input mode, keep existing values or allow free text
      return;
    }

    const found = customerList.find(c => c.id === customerId);
    if (found) {
      const updated: QuotationData = {
        ...data,
        namaPelanggan: found.namaPelanggan,
        nomorPelanggan: found.nomorPelanggan,
        jenisSector: found.jenisSector,
        ketentuanPembayaran: found.ketentuanPembayaran,
        ketentuanPengiriman: found.ketentuanPengiriman || data.ketentuanPengiriman || 'TJR',
        modelSerialUnit: found.modelSerialUnit || data.modelSerialUnit || 'ALL',
        idQuotation: generateIdQuotation(
          found.namaPelanggan,
          data.tanggal,
          data.idPembuatDokumen,
          data.nomorQuotation
        )
      };
      onChange(updated);
    }
  };

  const handleSaveCurrentAsNewCustomer = () => {
    if (!data.namaPelanggan?.trim()) return;

    const newRecord: CustomerRecord = {
      id: `cust-${Date.now()}`,
      namaPelanggan: data.namaPelanggan.trim().toUpperCase(),
      nomorPelanggan: (data.nomorPelanggan || '').trim(),
      jenisSector: (data.jenisSector || '').trim().toUpperCase(),
      ketentuanPembayaran: (data.ketentuanPembayaran || 'N30').trim().toUpperCase(),
      ketentuanPengiriman: (data.ketentuanPengiriman || 'TJR').trim().toUpperCase(),
      modelSerialUnit: data.modelSerialUnit || 'ALL'
    };

    const updatedList = addOrUpdateCustomer(newRecord);
    setCustomerList(updatedList);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const updateField = (field: keyof QuotationData, value: any) => {
    const updated = { ...data, [field]: value };
    
    // Automatically recalculate standardized ID Quotation (RFQ)
    if (['namaPelanggan', 'tanggal', 'idPembuatDokumen', 'nomorQuotation'].includes(field)) {
      updated.idQuotation = generateIdQuotation(
        field === 'namaPelanggan' ? value : data.namaPelanggan,
        field === 'tanggal' ? value : data.tanggal,
        field === 'idPembuatDokumen' ? value : data.idPembuatDokumen,
        field === 'nomorQuotation' ? value : data.nomorQuotation
      );
    }

    onChange(updated);
  };

  const handleRegenerateIdQuotation = () => {
    const newId = generateIdQuotation(data.namaPelanggan, data.tanggal, data.idPembuatDokumen, data.nomorQuotation);
    onChange({ ...data, idQuotation: newId });
  };

  const handleTermChange = (index: number, value: string) => {
    const updated = [...data.syaratKetentuan];
    updated[index] = value;
    onChange({ ...data, syaratKetentuan: updated });
  };

  const handleAddTerm = () => {
    onChange({ ...data, syaratKetentuan: [...data.syaratKetentuan, 'Syarat dan ketentuan tambahan.'] });
  };

  const handleDeleteTerm = (index: number) => {
    onChange({ ...data, syaratKetentuan: data.syaratKetentuan.filter((_, i) => i !== index) });
  };

  const handleResetToDefaultTerms = () => {
    onChange({ ...data, syaratKetentuan: SAMPLE_QUOTATION_DATA.syaratKetentuan });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 p-1.5 gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'info'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'info' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span>Data Dokumen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'customer'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'customer' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span>Pelanggan & Sector</span>
          {currentMatchedCustomer && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Terhubung Database" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('signer')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'signer'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'signer' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            <User className="w-3.5 h-3.5" />
          </div>
          <span>Penandatangan & Bank</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'terms' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span>Syarat & Ketentuan</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5">
        {/* ================= TAB 1: DATA QUOTATION ================= */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Kota / Cabang
              </label>
              <input
                type="text"
                value={data.kotaCabang}
                onChange={(e) => updateField('kotaCabang', e.target.value)}
                placeholder="Tanjung Redeb"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Tanggal Dokumen
              </label>
              <input
                type="text"
                value={data.tanggal}
                onChange={(e) => updateField('tanggal', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Nomor Urut Quotation
              </label>
              <input
                type="text"
                value={data.nomorQuotation ?? '1'}
                onChange={(e) => updateField('nomorQuotation', e.target.value)}
                placeholder="1"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  ID Quotation (RFQ)
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateIdQuotation}
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-bold cursor-pointer hover:underline"
                  title="Generate ulang format ID Quotation"
                >
                  Generate Format Otomatis
                </button>
              </div>
              <input
                type="text"
                value={data.idQuotation}
                onChange={(e) => updateField('idQuotation', e.target.value)}
                placeholder="RFQ-CUST-DDMMYY-TJRCOP1-1"
                className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 hover:border-amber-400 dark:hover:border-amber-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold text-slate-900 dark:text-amber-200 tracking-wide"
              />
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                <span>Format:</span>
                <code className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">RFQ-[Pelanggan]-[DDMMYY]-[ID Pembuat]-[No]</code>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Tarif Pajak PPN (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.pajakPersen}
                  onChange={(e) => updateField('pajakPersen', parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-semibold text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700">%</span>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Perihal Dokumen Penawaran
              </label>
              <input
                type="text"
                value={data.perihal}
                onChange={(e) => updateField('perihal', e.target.value)}
                placeholder="Surat Penawaran Harga Suku Cadang"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* ================= TAB 2: PELANGGAN & SECTOR ================= */}
        {activeTab === 'customer' && (
          <div className="space-y-4">
            {/* Database Selector Header Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-white block">
                      Pilih dari Database Master Pelanggan
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Otomatis mengisi Nomor Pelanggan, Jenis Sector, dan Ketentuan Pembayaran (TOP)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsDbModalOpen(true)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Database ({customerList.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDbModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Sheet</span>
                  </button>
                </div>
              </div>

              {/* Data Validation Select */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <div className="sm:col-span-3">
                  <select
                    value={currentMatchedCustomer ? currentMatchedCustomer.id : 'CUSTOM'}
                    onChange={(e) => handleSelectCustomerFromDb(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-semibold text-slate-900 dark:text-white cursor-pointer shadow-2xs"
                  >
                    <option value="">
                      {customerList.length === 0 
                        ? '-- Database Kosong (Klik "Import Sheet" untuk Isi) --' 
                        : '-- Pilih dari Database Pelanggan Resmi --'}
                    </option>
                    {customerList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.namaPelanggan} — No: {c.nomorPelanggan || '-'} ({c.jenisSector} | {c.ketentuanPembayaran})
                      </option>
                    ))}
                    <option value="CUSTOM">➕ [Input Manual / Custom Pelanggan]</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  {currentMatchedCustomer ? (
                    <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold rounded-xl flex items-center gap-1.5 justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Terhubung DB</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsNewCustomer}
                      disabled={!data.namaPelanggan?.trim()}
                      className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-[11px] font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Simpan ke DB</span>
                    </button>
                  )}
                </div>
              </div>

              {saveSuccessNotice && (
                <div className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Data pelanggan berhasil disimpan ke database master!
                </div>
              )}
            </div>

            {/* Input Grid Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nama Pelanggan / Perusahaan
                </label>
                <input
                  type="text"
                  value={data.namaPelanggan}
                  onChange={(e) => updateField('namaPelanggan', e.target.value)}
                  placeholder="Nama Pelanggan / Perusahaan"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-bold uppercase text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nomor Pelanggan (Customer Code)
                </label>
                <input
                  type="text"
                  value={data.nomorPelanggan}
                  onChange={(e) => updateField('nomorPelanggan', e.target.value)}
                  placeholder="Nomor Pelanggan"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Jenis Sector
                </label>
                <input
                  type="text"
                  value={data.jenisSector}
                  onChange={(e) => updateField('jenisSector', e.target.value)}
                  placeholder="Jenis Sector (e.g. MNG)"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Mata Uang
                </label>
                <input
                  type="text"
                  value={data.mataUang}
                  onChange={(e) => updateField('mataUang', e.target.value)}
                  placeholder="IDR"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Ketentuan Pembayaran (TOP)
                </label>
                <input
                  type="text"
                  value={data.ketentuanPembayaran}
                  onChange={(e) => updateField('ketentuanPembayaran', e.target.value)}
                  placeholder="TOP (e.g. N30, COD)"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Ketentuan Pengiriman
                </label>
                <input
                  type="text"
                  value={data.ketentuanPengiriman}
                  onChange={(e) => updateField('ketentuanPengiriman', e.target.value)}
                  placeholder="TJR"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Model / Serial Unit
                </label>
                <input
                  type="text"
                  value={data.modelSerialUnit}
                  onChange={(e) => updateField('modelSerialUnit', e.target.value)}
                  placeholder="ALL"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Referensi Inquiry
                </label>
                <input
                  type="text"
                  value={data.referensiInquiry}
                  onChange={(e) => updateField('referensiInquiry', e.target.value)}
                  placeholder="Referensi Inquiry"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  ID Pembuat Dokumen
                </label>
                <select
                  value={data.idPembuatDokumen || 'TJRCOP1'}
                  onChange={(e) => updateField('idPembuatDokumen', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-slate-800 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {VALID_CREATOR_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id} (Customer Order Processor)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PENANDATANGAN & BANK ================= */}
        {activeTab === 'signer' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nama Penandatangan
                </label>
                <input
                  type="text"
                  value={data.namaSigner}
                  onChange={(e) => updateField('namaSigner', e.target.value)}
                  placeholder="Nama"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={data.jabatanSigner}
                  onChange={(e) => updateField('jabatanSigner', e.target.value)}
                  placeholder="Customer Order Processor"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={data.teleponSigner}
                  onChange={(e) => updateField('teleponSigner', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-slate-800/80 rounded-2xl border border-blue-200/80 dark:border-slate-700 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={data.showSignatureStamp}
                  onChange={(e) => updateField('showSignatureStamp', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Tampilkan Stempel Digital Resmi PT United Tractors Tbk
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Menyertakan stempel dinas digital resmi PT United Tractors Tbk pada surat penawaran (tanpa tanda tangan).
                  </span>
                </div>
              </label>
            </div>

            {/* Bank Info */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Informasi Rekening Pembayaran (Muncul pada Syarat & Ketentuan #5)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Nama & Cabang Bank
                  </label>
                  <input
                    type="text"
                    value={data.bankCabang}
                    onChange={(e) => updateField('bankCabang', e.target.value)}
                    placeholder="BANK MANDIRI KCP Tanjung Redeb"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Nomor Rekening (Account)
                  </label>
                  <input
                    type="text"
                    value={data.bankAccount}
                    onChange={(e) => updateField('bankAccount', e.target.value)}
                    placeholder="148-0005385417"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Atas Nama Rekening
                  </label>
                  <input
                    type="text"
                    value={data.bankAtasNama}
                    onChange={(e) => updateField('bankAtasNama', e.target.value)}
                    placeholder="PT United Tractors Tbk"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SYARAT & KETENTUAN ================= */}
        {activeTab === 'terms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Syarat & Ketentuan Penawaran</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Gunakan tag <code className="bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono text-[10.5px]">{'{CUSTOMER_NAME}'}</code>, <code className="bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono text-[10.5px]">{'{BANK_CABANG}'}</code>, <code className="bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono text-[10.5px]">{'{BANK_ACCOUNT}'}</code> untuk nilai otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToDefaultTerms}
                className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-semibold cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Teks Standar</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {data.syaratKetentuan.map((syarat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-slate-50/60 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs mt-1 select-none shrink-0">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={syarat}
                    onChange={(e) => handleTermChange(idx, e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 transition-all text-slate-900 dark:text-white leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteTerm(idx)}
                    className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    title="Hapus baris syarat"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddTerm}
              className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 flex items-center gap-1.5 mt-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Poin Syarat & Ketentuan</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer Database Modal */}
      <CustomerDatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => {
          setIsDbModalOpen(false);
          const updatedList = getStoredCustomers();
          setCustomerList(updatedList);
          const matched = updatedList.find(c => 
            c.namaPelanggan.trim().toLowerCase() === (data.namaPelanggan || '').trim().toLowerCase()
          );
          if (matched) {
            onChange({
              ...data,
              namaPelanggan: matched.namaPelanggan,
              nomorPelanggan: matched.nomorPelanggan,
              jenisSector: matched.jenisSector,
              ketentuanPembayaran: matched.ketentuanPembayaran,
              ketentuanPengiriman: matched.ketentuanPengiriman || data.ketentuanPengiriman,
              modelSerialUnit: matched.modelSerialUnit || data.modelSerialUnit,
              idQuotation: generateIdQuotation(
                matched.namaPelanggan,
                data.tanggal,
                data.idPembuatDokumen,
                data.nomorQuotation
              )
            });
          }
        }}
        onSelectCustomer={(customer) => {
          const updatedList = getStoredCustomers();
          setCustomerList(updatedList);
          const updated: QuotationData = {
            ...data,
            namaPelanggan: customer.namaPelanggan,
            nomorPelanggan: customer.nomorPelanggan,
            jenisSector: customer.jenisSector,
            ketentuanPembayaran: customer.ketentuanPembayaran,
            ketentuanPengiriman: customer.ketentuanPengiriman || data.ketentuanPengiriman || 'TJR',
            modelSerialUnit: customer.modelSerialUnit || data.modelSerialUnit || 'ALL',
            idQuotation: generateIdQuotation(
              customer.namaPelanggan,
              data.tanggal,
              data.idPembuatDokumen,
              data.nomorQuotation
            )
          };
          onChange(updated);
        }}
        onDatabaseUpdated={() => {
          const updatedList = getStoredCustomers();
          setCustomerList(updatedList);
          const matched = updatedList.find(c => 
            c.namaPelanggan.trim().toLowerCase() === (data.namaPelanggan || '').trim().toLowerCase()
          );
          if (matched) {
            onChange({
              ...data,
              namaPelanggan: matched.namaPelanggan,
              nomorPelanggan: matched.nomorPelanggan,
              jenisSector: matched.jenisSector,
              ketentuanPembayaran: matched.ketentuanPembayaran,
              ketentuanPengiriman: matched.ketentuanPengiriman || data.ketentuanPengiriman,
              modelSerialUnit: matched.modelSerialUnit || data.modelSerialUnit,
              idQuotation: generateIdQuotation(
                matched.namaPelanggan,
                data.tanggal,
                data.idPembuatDokumen,
                data.nomorQuotation
              )
            });
          }
        }}
      />
    </div>
  );
};

