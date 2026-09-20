import React from 'react';
import { QuotationData, QuotationItem } from '../types';
import { UTLogo } from './UTLogo';
import { SignatureStamp } from './SignatureStamp';
import { formatIDR, formatDateIndo } from '../utils/numberFormat';

interface PDFPreviewProps {
  data: QuotationData;
  scale?: number;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ data, scale = 1 }) => {
  // Calculations
  const totalSebelumPajak = data.items.reduce((sum, item) => sum + (item.amount || (item.jumlah * (item.specialPrice || item.price || 0))), 0);
  const pajakAmount = data.pajakManual !== undefined && data.pajakManual !== null 
    ? data.pajakManual 
    : Math.round((totalSebelumPajak * data.pajakPersen) / 100);
  const totalSetelahPajak = totalSebelumPajak + pajakAmount;
  const totalItemCount = data.items.length;

  // Split items for Page 2 (and subsequent pages if there are many items, e.g. 18 items per page)
  const ITEMS_PER_PAGE = 18;
  const chunkedItems: QuotationItem[][] = [];
  if (data.items.length === 0) {
    chunkedItems.push([]);
  } else {
    for (let i = 0; i < data.items.length; i += ITEMS_PER_PAGE) {
      chunkedItems.push(data.items.slice(i, i + ITEMS_PER_PAGE));
    }
  }

  // Format terms text replacing placeholders
  const formatTerm = (term: string) => {
    return term
      .replace(/\{CUSTOMER_NAME\}/g, data.namaPelanggan || 'Pelanggan')
      .replace(/\{BANK_CABANG\}/g, data.bankCabang || '')
      .replace(/\{BANK_ACCOUNT\}/g, data.bankAccount || '');
  };

  return (
    <div 
      className="flex flex-col items-center gap-8 py-4 select-none print:p-0 print:m-0 print:gap-0"
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center'
      }}
    >
      {/* ================= PAGE 1: COVER LETTER / SURAT PENAWARAN ================= */}
      <div 
        id="quotation-page-1"
        className="a4-page bg-white text-black font-sans relative shadow-xl print:shadow-none print:m-0 box-border overflow-hidden"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '16mm 18mm 16mm 18mm',
          fontSize: '11pt',
          lineHeight: '1.35',
          color: '#000000',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        {/* Header: Logo & City/Date */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <UTLogo size="md" />
            <div className="mt-3 text-[13px] font-normal text-black">
              <span className="font-semibold">{data.kotaCabang || ''}</span>
              {data.kotaCabang && <span>, </span>}
              <span>{formatDateIndo(data.tanggal)}</span>
            </div>
          </div>
        </div>

        {/* Metadata Lines */}
        <div className="space-y-1 text-[12.5px] mb-5">
          <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
            <span className="text-black">Nomor Quotation</span>
            <span>:</span>
            <span className="font-medium text-black">{data.nomorQuotation || '1'}</span>
          </div>
          <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
            <span className="text-black">ID Quotation</span>
            <span>:</span>
            <span className="font-medium text-black">{data.idQuotation || '-'}</span>
          </div>
          <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
            <span className="text-black">Perihal</span>
            <span>:</span>
            <span className="font-bold text-black">{data.perihal || 'Surat Penawaran Harga Suku Cadang'}</span>
          </div>
        </div>

        {/* Recipient */}
        <div className="mb-4 text-[12.5px]">
          <p className="text-black">Kepada Yang Terhormat,</p>
          <p className="font-bold text-black uppercase tracking-tight text-[13px] mt-0.5">
            {data.namaPelanggan || ''}
          </p>
        </div>

        {/* Salutation */}
        <div className="mb-3 text-[12.5px]">
          <p>Dengan Hormat,</p>
          <p className="mt-1">Berikut ini kami sampaikan penawaran harga untuk "Suku Cadang" yaitu:</p>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-2 gap-x-8 text-[12px] mb-4">
          {/* Left Column */}
          <div className="space-y-1">
            <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
              <span>Jenis Sector</span>
              <span>:</span>
              <span className="font-medium">{data.jenisSector || ''}</span>
            </div>
            <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
              <span>Nomor Pelanggan</span>
              <span>:</span>
              <span className="font-medium">{data.nomorPelanggan || ''}</span>
            </div>
            <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
              <span>Ketentuan Pengiriman</span>
              <span>:</span>
              <span className="font-medium">{data.ketentuanPengiriman || ''}</span>
            </div>
            <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
              <span>Referensi Inquiry</span>
              <span>:</span>
              <span className="font-medium">{data.referensiInquiry || ''}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-1">
            <div className="grid grid-cols-[150px_10px_1fr] items-baseline">
              <span>Mata Uang</span>
              <span>:</span>
              <span className="font-medium">{data.mataUang || 'IDR'}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr] items-baseline">
              <span>Ketentuan Pembayaran</span>
              <span>:</span>
              <span className="font-medium">{data.ketentuanPembayaran || ''}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr] items-baseline">
              <span>Model/Serial Unit</span>
              <span>:</span>
              <span className="font-medium">{data.modelSerialUnit || ''}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr] items-baseline">
              <span>ID Pembuat Dokumen</span>
              <span>:</span>
              <span className="font-medium">{data.idPembuatDokumen || ''}</span>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-black text-[12px]">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black p-1.5 text-left font-bold text-black w-[45%] whitespace-nowrap">Nama Barang</th>
                <th className="border-r border-black p-1.5 text-center font-bold text-black w-[15%] whitespace-nowrap">Jumlah Item</th>
                <th className="border-r border-black p-1.5 text-center font-bold text-black w-[20%] whitespace-nowrap">Harga Jual</th>
                <th className="p-1.5 text-center font-bold text-black w-[20%] whitespace-nowrap">Estimasi Pemenuhan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black">
                <td className="border-r border-black p-1.5 text-left text-black">
                  {data.namaBarangSummary || 'Penawaran Suku cadang, detail terlampir'}
                </td>
                <td className="border-r border-black p-1.5 text-center text-black whitespace-nowrap">
                  {totalItemCount}
                </td>
                <td className="border-r border-black p-1.5 text-right text-black font-medium pr-3 whitespace-nowrap">
                  {formatIDR(totalSebelumPajak)}
                </td>
                <td className="p-1.5 text-center text-black whitespace-nowrap">
                  {data.estimasiPemenuhanSummary || 'terlampir'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Subtotal, Pajak, Total block */}
          <div className="flex justify-end mt-1 text-[12px]">
            <div className="w-[300px] space-y-0.5">
              <div className="flex justify-between py-0.5">
                <span className="text-black">Total sebelum pajak</span>
                <span className="font-medium text-black text-right min-w-[100px]">{formatIDR(totalSebelumPajak)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-black">Pajak</span>
                <span className="font-medium text-black text-right min-w-[100px]">{formatIDR(pajakAmount)}</span>
              </div>
              <div className="flex justify-between py-0.5 font-bold">
                <span className="text-black">Total setelah pajak</span>
                <span className="text-black text-right min-w-[100px]">{formatIDR(totalSetelahPajak)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Syarat dan Ketentuan */}
        <div className="mb-4 text-[10.5px] leading-relaxed">
          <p className="font-normal mb-1 text-black">Syarat dan ketentuan:</p>
          <ol className="space-y-0.5 list-none pl-0 text-black">
            {data.syaratKetentuan.map((syarat, idx) => (
              <li key={idx} className="flex items-start">
                <span className="min-w-[18px] select-none">{idx + 1}.</span>
                <span className="text-justify">{formatTerm(syarat)}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Closing Note */}
        <div className="mb-3 text-[12px] text-black">
          <p>Demikian surat penawaran harga ini kami sampaikan. Terima kasih.</p>
        </div>

        {/* Signature & Signer Block */}
        <div className="mb-6">
          <SignatureStamp
            companyName={data.namaPerusahaan}
            signerName={data.namaSigner}
            signerRole={data.jabatanSigner}
            signerPhone={data.teleponSigner}
            showStamp={data.showSignatureStamp}
          />
        </div>

        {/* Page 1 Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-black">
          Page 1
        </div>
      </div>

      {/* ================= PAGE 2 (and onwards): LAMPIRAN DETAIL ================= */}
      {chunkedItems.map((itemsChunk, pageIdx) => {
        const currentPageNumber = pageIdx + 2;
        return (
          <div
            key={`lampiran-page-${pageIdx}`}
            id={`quotation-page-${currentPageNumber}`}
            className="a4-page bg-white text-black font-sans relative shadow-xl print:shadow-none print:m-0 box-border overflow-hidden print:break-before-page"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '14mm 10mm 14mm 10mm',
              fontSize: '10pt',
              lineHeight: '1.25',
              color: '#000000',
              fontFamily: 'Arial, Helvetica, sans-serif'
            }}
          >
            {/* Header: Logo and Title */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <UTLogo size="md" />
              </div>
              <div className="text-right">
                <h2 className="text-[13px] font-bold text-black tracking-normal uppercase">
                  LAMPIRAN DETAIL PENAWARAN SUKU CADANG
                </h2>
              </div>
            </div>

            {/* Metadata Rows */}
            <div className="space-y-0.5 text-[11px] mb-4">
              <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                <span className="whitespace-nowrap">ID Quotation</span>
                <span>:</span>
                <span className="font-normal text-black whitespace-nowrap">{data.idQuotation || '-'}</span>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                <span className="whitespace-nowrap">Tanggal</span>
                <span>:</span>
                <span className="font-normal text-black whitespace-nowrap">{formatDateIndo(data.tanggal)}</span>
              </div>
              <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                <span className="whitespace-nowrap">No/Nama Pelanggan</span>
                <span>:</span>
                <span className="font-normal text-black whitespace-nowrap">
                  {[data.nomorPelanggan, data.namaPelanggan].filter(Boolean).join(' / ') || '-'}
                </span>
              </div>
            </div>

            {/* Detail Items Table - No Wrap Text */}
            <div className="w-full mb-6">
              <table className="w-full border-collapse border border-black text-[8.5px] leading-tight table-auto">
                <thead>
                  <tr className="border-b border-black bg-white">
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">No</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Material</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">ITC</th>
                    <th className="border-r border-black px-1.5 py-1.5 text-left font-bold text-black whitespace-nowrap">Description</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Jumlah</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Unit</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Price</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Special Price</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Amount</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Stock</th>
                    <th className="border-r border-black px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Estimasi Leadtime</th>
                    <th className="px-1 py-1.5 text-center font-bold text-black whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsChunk.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-4 text-center text-gray-500 italic whitespace-nowrap">
                        Belum ada data suku cadang. Silakan masukkan data atau paste tabel suku cadang.
                      </td>
                    </tr>
                  ) : (
                    itemsChunk.map((item, rowIdx) => {
                      return (
                        <tr key={item.id || rowIdx} className="border-b border-black">
                          <td className="border-r border-black px-1 py-1 text-center text-black whitespace-nowrap">
                            {item.no || (rowIdx + 1) * 10}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-center text-black font-medium whitespace-nowrap">
                            {item.material || '-'}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-center text-black whitespace-nowrap">
                            {item.itc || ''}
                          </td>
                          <td className="border-r border-black px-1.5 py-1 text-left text-black uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]">
                            {item.description || '-'}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-center text-black whitespace-nowrap">
                            {item.jumlah}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-center text-black whitespace-nowrap">
                            {item.unit || 'PC'}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-right text-black whitespace-nowrap">
                            {item.price > 0 ? formatIDR(item.price) : '-'}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-right text-black font-medium whitespace-nowrap">
                            {item.specialPrice > 0 ? formatIDR(item.specialPrice) : (item.price > 0 ? formatIDR(item.price) : '-')}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-right text-black font-medium whitespace-nowrap">
                            {formatIDR(item.amount || (item.jumlah * (item.specialPrice || item.price || 0)))}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-center text-black font-medium whitespace-nowrap">
                            {item.stock || ''}
                          </td>
                          <td className="border-r border-black px-1 py-1 text-center text-black whitespace-nowrap">
                            {item.estimasiLeadtime || ''}
                          </td>
                          <td className="px-1 py-1 text-center text-black whitespace-nowrap">
                            {item.remarks || ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Page Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-black">
              Page {currentPageNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
};
