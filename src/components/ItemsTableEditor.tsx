import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Percent, 
  ArrowUpDown, 
  ClipboardPaste, 
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import { QuotationItem } from '../types';
import { formatIDR, parseNumber, extractDiscountPercent } from '../utils/numberFormat';

interface ItemsTableEditorProps {
  items: QuotationItem[];
  onChange: (items: QuotationItem[]) => void;
  onOpenPasteModal: () => void;
}

/**
 * Dedicated Price Input Cell that allows seamless unrestricted manual typing of any amount
 * (from 0 up to billions/trillions) with instant live thousands separators and no jumping cursors.
 */
const PriceInputCell: React.FC<{
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = '0', className }) => {
  const [localText, setLocalText] = useState<string>(value ? formatIDR(value) : '');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalText(value ? formatIDR(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Strip non-digit characters so user can type freely without limits
    const cleanDigits = rawVal.replace(/\D/g, '');
    
    if (!cleanDigits) {
      setLocalText('');
      onChange(0);
      return;
    }

    const numVal = parseInt(cleanDigits, 10);
    // Format dynamically with thousand separator dots
    setLocalText(formatIDR(numVal));
    onChange(numVal);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={localText}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setLocalText(value ? formatIDR(value) : '');
      }}
      onChange={handleChange}
      className={className}
    />
  );
};

// Retrieve current discount percentage for an item
export const getDiscountPercent = (item: QuotationItem): string => {
  const extracted = extractDiscountPercent(item.remarks);
  if (extracted !== null) {
    return String(extracted);
  }
  if (item.price > 0 && item.specialPrice > 0 && item.price > item.specialPrice) {
    const pct = Math.round(((item.price - item.specialPrice) / item.price) * 100);
    return String(pct);
  }
  return '';
};

export const ItemsTableEditor: React.FC<ItemsTableEditorProps> = ({
  items,
  onChange,
  onOpenPasteModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkDiscountInput, setBulkDiscountInput] = useState<string>('');
  const [showBulkDiscount, setShowBulkDiscount] = useState<boolean>(false);

  // Update a single item with full bidirectional calculation
  const handleItemChange = (id: string, field: keyof QuotationItem, value: any) => {
    const updated = items.map(item => {
      if (item.id !== id) return item;

      const newItem = { ...item, [field]: value };

      // 1. Gross Price (price) changes
      if (field === 'price') {
        const newGross = parseNumber(value);
        newItem.price = newGross;

        const currentDisc = extractDiscountPercent(item.remarks);

        if (currentDisc !== null && currentDisc > 0 && currentDisc <= 100 && newGross > 0) {
          // Calculate Special Price from Gross Price and discount remarks
          const newSpecPrice = Math.round(newGross * (1 - currentDisc / 100));
          newItem.specialPrice = newSpecPrice;
        } else if (item.specialPrice > 0 && newGross > 0) {
          if (newGross > item.specialPrice) {
            // Implied discount from difference
            const discPct = Math.round(((newGross - item.specialPrice) / newGross) * 100);
            if (discPct > 0) {
              newItem.remarks = `DISKON ${discPct}%`;
            }
          } else {
            newItem.specialPrice = newGross;
            if (extractDiscountPercent(item.remarks) !== null) {
              newItem.remarks = '';
            }
          }
        } else {
          newItem.specialPrice = newGross;
        }
      }

      // 2. Special Price (specialPrice) changes
      else if (field === 'specialPrice') {
        const newSpecPrice = parseNumber(value);
        newItem.specialPrice = newSpecPrice;

        const currentDisc = extractDiscountPercent(item.remarks);

        if (currentDisc !== null && currentDisc > 0 && currentDisc < 100 && newSpecPrice > 0) {
          // Special Price is filled first with discount in remarks: Gross Price = Special Price / (1 - disc/100)
          const newGross = Math.round(newSpecPrice / (1 - currentDisc / 100));
          newItem.price = newGross;
        } else if (item.price > 0 && newSpecPrice > 0) {
          if (newSpecPrice < item.price) {
            // Calculate implied discount
            const discPct = Math.round(((item.price - newSpecPrice) / item.price) * 100);
            if (discPct > 0) {
              newItem.remarks = `DISKON ${discPct}%`;
            }
          } else if (newSpecPrice >= item.price) {
            newItem.price = newSpecPrice;
            if (extractDiscountPercent(item.remarks) !== null) {
              newItem.remarks = '';
            }
          }
        } else if (newSpecPrice > 0 && (!item.price || item.price === 0)) {
          // No gross price & no discount: default gross price to special price
          newItem.price = newSpecPrice;
        }
      }

      // 3. Quantity (jumlah) changes
      else if (field === 'jumlah') {
        const qty = Math.max(1, parseNumber(value));
        newItem.jumlah = qty;
      }

      // ALWAYS synchronize Amount directly with Qty * Special Price (or Gross Price if special is 0)
      const effectivePrice = newItem.specialPrice > 0 ? newItem.specialPrice : (newItem.price > 0 ? newItem.price : 0);
      const currentQty = typeof newItem.jumlah === 'number' && newItem.jumlah > 0 ? newItem.jumlah : 1;
      newItem.amount = currentQty * effectivePrice;

      return newItem;
    });

    onChange(updated);
  };

  // Change discount percent directly for a specific item
  const handleDiscountPercentChange = (id: string, discountValStr: string) => {
    const updated = items.map(item => {
      if (item.id !== id) return item;

      const trimmed = discountValStr.trim();
      const currentQty = item.jumlah || 1;

      if (trimmed === '') {
        // Clear discount: Special Price resets to Gross Price (or vice versa)
        const basePrice = item.price > 0 ? item.price : item.specialPrice;
        const isDiskonRemark = extractDiscountPercent(item.remarks) !== null;
        return {
          ...item,
          price: basePrice,
          specialPrice: basePrice,
          amount: currentQty * basePrice,
          remarks: isDiskonRemark ? '' : item.remarks
        };
      }

      const discPercent = parseFloat(trimmed.replace(',', '.'));
      if (isNaN(discPercent) || discPercent < 0) return item;

      const clampedDisc = Math.min(100, Math.max(0, discPercent));
      let gross = item.price;
      let special = item.specialPrice;

      if (gross > 0) {
        // Calculate special price from gross price
        special = Math.round(gross * (1 - clampedDisc / 100));
      } else if (special > 0 && clampedDisc < 100) {
        // If special price was filled first, calculate gross from special
        gross = Math.round(special / (1 - clampedDisc / 100));
      }

      const effectivePrice = special > 0 ? special : (gross > 0 ? gross : 0);
      const isOldDiskonRemark = extractDiscountPercent(item.remarks) !== null;
      const newRemarks = clampedDisc > 0 
        ? `DISKON ${clampedDisc}%` 
        : (isOldDiskonRemark ? '' : item.remarks);

      return {
        ...item,
        price: gross,
        specialPrice: special,
        amount: currentQty * effectivePrice,
        remarks: newRemarks
      };
    });

    onChange(updated);
  };

  // Handle remarks text change (also detects if user manually types e.g. "DISKON 20%", "DISKON 0%", or "20%")
  const handleRemarksChange = (id: string, newRemarks: string) => {
    const updated = items.map(item => {
      if (item.id !== id) return item;

      const disc = extractDiscountPercent(newRemarks);
      let gross = item.price;
      let special = item.specialPrice;

      if (disc !== null && disc >= 0 && disc <= 100) {
        if (gross > 0) {
          special = Math.round(gross * (1 - disc / 100));
        } else if (special > 0 && disc < 100) {
          gross = Math.round(special / (1 - disc / 100));
        }
      }

      const effectivePrice = special > 0 ? special : (gross > 0 ? gross : 0);
      const currentQty = item.jumlah || 1;

      return {
        ...item,
        price: gross,
        specialPrice: special,
        amount: currentQty * effectivePrice,
        remarks: newRemarks
      };
    });

    onChange(updated);
  };

  // Add new item
  const handleAddItem = () => {
    const nextNo = (items.length + 1) * 10;
    const newItem: QuotationItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      no: String(nextNo),
      material: '',
      itc: '',
      description: '',
      jumlah: 1,
      unit: 'PC',
      price: 0,
      specialPrice: 0,
      amount: 0,
      stock: '',
      estimasiLeadtime: '',
      remarks: ''
    };
    onChange([...items, newItem]);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    onChange(items.filter(i => i.id !== id));
  };

  // Duplicate item
  const handleDuplicateItem = (item: QuotationItem) => {
    const duplicate: QuotationItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      no: String((items.length + 1) * 10)
    };
    onChange([...items, duplicate]);
  };

  // Renumber all items to 10, 20, 30...
  const handleRenumber = () => {
    const updated = items.map((item, idx) => ({
      ...item,
      no: String((idx + 1) * 10)
    }));
    onChange(updated);
  };

  // Bulk Apply Discount % (e.g. 25% discount)
  const handleApplyBulkDiscount = (discountVal?: number) => {
    const discountPercent = discountVal !== undefined ? discountVal : parseNumber(bulkDiscountInput);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) return;

    const updated = items.map(item => {
      const gross = item.price > 0 ? item.price : item.specialPrice;
      if (gross <= 0) return item;

      const netPrice = Math.round(gross * (1 - discountPercent / 100));
      const remarksText = discountPercent > 0 ? `DISKON ${discountPercent}%` : '';

      return {
        ...item,
        price: gross,
        specialPrice: netPrice,
        amount: item.jumlah * netPrice,
        remarks: remarksText
      };
    });

    onChange(updated);
    setShowBulkDiscount(false);
    setBulkDiscountInput('');
  };

  const filteredItems = items.filter(i => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.material.toLowerCase().includes(term) ||
      i.description.toLowerCase().includes(term) ||
      (i.itc && i.itc.toLowerCase().includes(term)) ||
      i.remarks.toLowerCase().includes(term)
    );
  });

  const totalAmount = items.reduce((s, i) => s + (i.amount || i.jumlah * (i.specialPrice || i.price || 0)), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-colors relative">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl flex flex-wrap items-center justify-between gap-3 relative z-20">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Suku Cadang ({items.length} Item)
            </h3>
            <p className="text-xs text-slate-500">
              Edit langsung di tabel atau gunakan tombol Paste untuk import cepat.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenPasteModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste / Import Tabel
          </button>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs border border-transparent"
          >
            <Plus className="w-4 h-4" />
            Tambah Baris
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBulkDiscount(!showBulkDiscount)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                showBulkDiscount
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-amber-600" />
              Set Diskon Massal
            </button>

            {showBulkDiscount && (
              <>
                {/* Backdrop for closing when clicking outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBulkDiscount(false)}
                />
                
                {/* Popover Card */}
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <label className="text-xs font-bold text-slate-900">
                      Set Diskon ke Semua Item:
                    </label>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Otomatis Special Price</span>
                  </div>

                  {/* Quick Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Pilihan Cepat:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyBulkDiscount(0)}
                        className="col-span-2 px-2 py-1.5 text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer text-center"
                        title="Kembalikan ke harga normal (tanpa diskon)"
                      >
                        0% (Normal)
                      </button>
                      {[10, 15, 20, 25, 30, 35].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleApplyBulkDiscount(pct)}
                          className="px-2 py-1.5 text-xs font-semibold bg-amber-50 text-amber-900 hover:bg-amber-200/80 rounded-lg border border-amber-200 transition-colors cursor-pointer text-center"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Percentage Input */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">Atau Masukkan Persentase:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Contoh: 12.5"
                          value={bulkDiscountInput}
                          onChange={(e) => setBulkDiscountInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyBulkDiscount();
                          }}
                          className="w-full text-xs p-2 pr-6 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono bg-slate-50 focus:bg-white"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyBulkDiscount()}
                        className="px-3.5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-600 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>

                  {/* Footer Close */}
                  <div className="flex justify-end pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBulkDiscount(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleRenumber}
            title="Rapikan urutan nomor menjadi 10, 20, 30..."
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar if more than 3 items */}
      {items.length > 3 && (
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari part no, deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
            />
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Total Subtotal: <span className="font-bold text-slate-900 dark:text-white font-mono">Rp {formatIDR(totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Interactive Table */}
      <div className="overflow-x-auto rounded-b-2xl">
        <table className="w-full text-left text-xs border-collapse font-sans min-w-[1060px]">
          <thead className="bg-slate-100/80 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-2 text-center w-12">No</th>
              <th className="p-2 w-28">Material</th>
              <th className="p-2 w-20">ITC</th>
              <th className="p-2 min-w-[160px]">Description</th>
              <th className="p-2 text-center w-16">Qty</th>
              <th className="p-2 text-center w-16">Unit</th>
              <th className="p-2 text-right w-32 min-w-[115px]">Gross Price</th>
              <th className="p-2 text-right w-32 min-w-[115px]">Special Price</th>
              <th className="p-2 text-right w-32 min-w-[115px]">Amount</th>
              <th className="p-2 text-center w-20">Stock</th>
              <th className="p-2 text-center w-24">Leadtime</th>
              <th className="p-2 min-w-[190px]">Diskon & Remarks</th>
              <th className="p-2 text-center w-16">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 dark:text-slate-500">
                  {items.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs">Tabel penawaran masih kosong.</p>
                      <button
                        type="button"
                        onClick={onOpenPasteModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 shadow-xs cursor-pointer"
                      >
                        <ClipboardPaste className="w-4 h-4" />
                        Paste Data dari Excel/TSV
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs">Tidak ada item yang cocok dengan pencarian "{searchTerm}".</p>
                  )}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-amber-50/30 dark:hover:bg-slate-800/60 transition-colors group">
                  {/* No */}
                  <td className="p-1 text-center">
                    <input
                      type="text"
                      value={item.no}
                      onChange={(e) => handleItemChange(item.id, 'no', e.target.value)}
                      className="w-10 text-center font-mono text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </td>

                  {/* Material */}
                  <td className="p-1">
                    <input
                      type="text"
                      placeholder="Part No"
                      value={item.material}
                      onChange={(e) => handleItemChange(item.id, 'material', e.target.value)}
                      className="w-full font-mono font-bold text-slate-800 dark:text-slate-100 text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </td>

                  {/* ITC */}
                  <td className="p-1">
                    <input
                      type="text"
                      placeholder="-"
                      value={item.itc || ''}
                      onChange={(e) => handleItemChange(item.id, 'itc', e.target.value)}
                      className="w-full text-slate-600 dark:text-slate-300 text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </td>

                  {/* Description */}
                  <td className="p-1">
                    <input
                      type="text"
                      placeholder="Deskripsi Part"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full uppercase font-medium text-slate-800 dark:text-slate-200 text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </td>

                  {/* Qty */}
                  <td className="p-1 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.jumlah}
                      onChange={(e) => handleItemChange(item.id, 'jumlah', parseInt(e.target.value) || 1)}
                      className="w-14 text-center font-mono text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </td>

                  {/* Unit */}
                  <td className="p-1 text-center">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                      className="w-12 text-center text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 uppercase text-slate-800 dark:text-slate-200"
                    />
                  </td>

                  {/* Gross Price */}
                  <td className="p-1 text-right">
                    <PriceInputCell
                      placeholder="0"
                      value={item.price}
                      onChange={(val) => handleItemChange(item.id, 'price', val)}
                      className="w-full text-right font-mono text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 text-slate-600 dark:text-slate-400"
                    />
                  </td>

                  {/* Special Price */}
                  <td className="p-1 text-right">
                    <PriceInputCell
                      placeholder="0"
                      value={item.specialPrice}
                      onChange={(val) => handleItemChange(item.id, 'specialPrice', val)}
                      className="w-full text-right font-mono font-bold text-slate-900 dark:text-amber-400 text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </td>

                  {/* Amount (Calculated / Readonly or Override) */}
                  <td className="p-1 text-right font-mono font-bold text-slate-900 dark:text-white pr-2">
                    {formatIDR(item.amount || (item.jumlah * (item.specialPrice || item.price || 0)))}
                  </td>

                  {/* Stock */}
                  <td className="p-1 text-center">
                    <input
                      type="text"
                      placeholder="Stock"
                      value={item.stock}
                      onChange={(e) => handleItemChange(item.id, 'stock', e.target.value)}
                      className="w-16 text-center text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 uppercase text-slate-800 dark:text-slate-200"
                    />
                  </td>

                  {/* Estimasi Leadtime */}
                  <td className="p-1 text-center">
                    <input
                      type="text"
                      placeholder="Leadtime"
                      value={item.estimasiLeadtime}
                      onChange={(e) => handleItemChange(item.id, 'estimasiLeadtime', e.target.value)}
                      className="w-20 text-center text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </td>

                  {/* Diskon & Remarks */}
                  <td className="p-1">
                    <div className="flex items-center gap-1">
                      {/* Input Diskon (%) */}
                      <div className="relative flex items-center w-16 shrink-0" title="Ketik persentase diskon (contoh: 25). Special Price dan Remarks akan otomatis terhitung">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Disc"
                          value={getDiscountPercent(item)}
                          onChange={(e) => handleDiscountPercentChange(item.id, e.target.value)}
                          className="w-full pl-1.5 pr-4 py-1 text-xs font-bold text-amber-950 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded hover:border-amber-400 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-amber-500 text-center font-mono placeholder:text-amber-400/50 placeholder:font-normal"
                        />
                        <span className="absolute right-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 pointer-events-none">%</span>
                      </div>

                      {/* Input Keterangan / Remarks */}
                      <input
                        type="text"
                        placeholder="Keterangan / Remarks"
                        value={item.remarks}
                        onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                        className="w-full min-w-[90px] text-xs p-1 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(item)}
                        title="Duplikat baris"
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Hapus baris"
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
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
      </div>
    </div>
  );
};
