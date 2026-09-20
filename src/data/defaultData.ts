import { QuotationData } from '../types';
import { generateIdQuotation } from '../utils/quotationHelper';

export function getTodayDateString(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

const todayStr = getTodayDateString();

export const SAMPLE_QUOTATION_DATA: QuotationData = {
  kotaCabang: 'Tanjung Redeb',
  tanggal: todayStr,
  nomorQuotation: '1',
  idQuotation: generateIdQuotation('', todayStr, 'TJRCOP1', '1'),
  perihal: 'Surat Penawaran Harga Suku Cadang',

  namaPelanggan: '',
  nomorPelanggan: '',

  jenisSector: '',
  mataUang: 'IDR',
  ketentuanPengiriman: 'TJR',
  ketentuanPembayaran: '',
  referensiInquiry: '',
  modelSerialUnit: 'ALL',
  idPembuatDokumen: 'TJRCOP1',

  namaBarangSummary: 'Penawaran Suku cadang, detail terlampir',
  estimasiPemenuhanSummary: 'terlampir',

  pajakPersen: 11, // PPN 11%

  syaratKetentuan: [
    'Harga pada surat penawaran ini berlaku sampai dengan 7 (tujuh) hari sejak dokumen penawaran ini diterbitkan.',
    'Ketersediaan stock suku cadang dan estimasi leadtime pengiriman pada penawaran ini dapat berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu kepada pembeli serta estimasi hanya berlaku di hari kerja.',
    'Surat penawaran ini bukan merupakan kesepakatan/perikatan dengan {CUSTOMER_NAME}, sehingga PT United Tractors Tbk tidak memiliki kewajiban apapun terhadap siapapun.',
    'Surat penawaran ini hanya ditujukan kepada {CUSTOMER_NAME} dan dengan demikian tidak berlaku untuk pihak manapun dan tidak dapat dipergunakan untuk kepentingan apapun oleh {CUSTOMER_NAME}.',
    'Transaksi pembayaran di transfer ke rekening atas nama PT United Tractors Tbk, Cabang: {BANK_CABANG}, Account: {BANK_ACCOUNT}'
  ],

  namaPerusahaan: 'PT United Tractors, Tbk',
  namaSigner: '',
  jabatanSigner: 'Customer Order Processor',
  teleponSigner: '',
  showSignatureStamp: true,

  bankNama: 'BANK MANDIRI',
  bankCabang: 'BANK MANDIRI KCP Tanjung Redeb',
  bankAccount: '148-0005385417',
  bankAtasNama: 'PT United Tractors Tbk',

  items: []
};


