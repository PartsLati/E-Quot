export interface QuotationItem {
  id: string;
  no: string; // e.g. "10", "20", "1", "2"
  material: string; // Part Number e.g. "2357653"
  itc?: string; // ITC code e.g. ""
  description: string; // e.g. "HOSE ASSEM"
  jumlah: number; // Qty e.g. 1
  unit: string; // e.g. "PC", "SET", "EA"
  price: number; // Gross Price e.g. 3717400
  specialPrice: number; // Net Unit Price e.g. 2788050
  amount: number; // Total = jumlah * specialPrice
  stock: string; // e.g. "TMD", "AVL", "JKT", "BPN"
  estimasiLeadtime: string; // e.g. "7 Hari", "Ready Stock", "2-3 Minggu"
  remarks: string; // e.g. "DISKON 25%", "GENUINE"
}

export interface QuotationData {
  // Document Header
  kotaCabang: string; // e.g. "Tanjung Redeb"
  tanggal: string; // e.g. "27/08/2026"
  nomorQuotation: string; // e.g. "2708261"
  idQuotation: string; // e.g. "RFQ-BTW-2708261-TJRCOP3-GEN"
  perihal: string; // e.g. "Surat Penawaran Harga Suku Cadang"
  
  // Recipient
  namaPelanggan: string; // e.g. "BARA TAMA WIJAYA"
  nomorPelanggan: string; // e.g. "43054"
  
  // Attributes (2-Column Info Grid)
  jenisSector: string; // e.g. "MNG"
  mataUang: string; // e.g. "IDR"
  ketentuanPengiriman: string; // e.g. "TJR"
  ketentuanPembayaran: string; // e.g. "N30"
  referensiInquiry: string; // e.g. "GEN"
  modelSerialUnit: string; // e.g. "ALL"
  idPembuatDokumen: string; // e.g. "TJRCOP3"
  
  // Summary Item Header Description
  namaBarangSummary: string; // e.g. "Penawaran Suku cadang, detail terlampir"
  estimasiPemenuhanSummary: string; // e.g. "terlampir"
  
  // Tax & Calculations
  pajakPersen: number; // e.g. 11 (PPN 11%)
  pajakManual?: number | null; // Optional manual override
  
  // Terms and Conditions
  syaratKetentuan: string[];
  
  // Signer / Closing
  namaPerusahaan: string; // "PT United Tractors, Tbk"
  namaSigner: string; // "Ali Ghazali"
  jabatanSigner: string; // "Customer Order Processor"
  teleponSigner: string; // "0823-5141-1746"
  showSignatureStamp: boolean;
  
  // Bank Information (Item #5)
  bankNama: string; // "BANK MANDIRI"
  bankCabang: string; // "KCP Tanjung Redeb"
  bankAccount: string; // "148-0005385417"
  bankAtasNama: string; // "PT United Tractors Tbk"

  // Items
  items: QuotationItem[];
}

export interface ColumnMapping {
  no: number;
  material: number;
  itc: number;
  description: number;
  jumlah: number;
  unit: number;
  price: number;
  specialPrice: number;
  amount: number;
  stock: number;
  estimasiLeadtime: number;
  remarks: number;
}
