export interface CustomerRecord {
  id: string;
  namaPelanggan: string;
  nomorPelanggan: string;
  jenisSector: string;
  ketentuanPembayaran: string;
  ketentuanPengiriman?: string;
  modelSerialUnit?: string;
}

// Database default kosong sesuai permintaan user (diisi lewat import file atau copy-paste)
export const DEFAULT_CUSTOMER_DATABASE: CustomerRecord[] = [];

const CUSTOMER_STORAGE_KEY = 'equot_ut_customer_database_v2';

export function getStoredCustomers(): CustomerRecord[] {
  try {
    const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((c, idx) => ({
          ...c,
          id: c.id || `cust-${Date.now()}-${idx}-${(c.namaPelanggan || '').replace(/\s+/g, '_')}`
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored customers', e);
  }
  return DEFAULT_CUSTOMER_DATABASE;
}

export function saveStoredCustomers(customers: CustomerRecord[]): void {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error('Failed to save customer database', e);
  }
}

export function addOrUpdateCustomer(customer: CustomerRecord): CustomerRecord[] {
  const current = getStoredCustomers();
  
  // Find match by ID first, or by case-insensitive name
  const index = current.findIndex(
    c => (customer.id && c.id && c.id === customer.id) || 
    (c.namaPelanggan && customer.namaPelanggan && c.namaPelanggan.trim().toLowerCase() === customer.namaPelanggan.trim().toLowerCase())
  );

  const finalRecord: CustomerRecord = {
    id: (index >= 0 && current[index].id) ? current[index].id : (customer.id || `cust-${Date.now()}`),
    namaPelanggan: (customer.namaPelanggan || '').trim().toUpperCase(),
    nomorPelanggan: (customer.nomorPelanggan || '').trim(),
    jenisSector: (customer.jenisSector !== undefined && customer.jenisSector !== null ? customer.jenisSector : '').trim().toUpperCase(),
    ketentuanPembayaran: (customer.ketentuanPembayaran !== undefined && customer.ketentuanPembayaran !== null ? customer.ketentuanPembayaran : 'N30').trim().toUpperCase(),
    ketentuanPengiriman: (customer.ketentuanPengiriman !== undefined && customer.ketentuanPengiriman !== null ? customer.ketentuanPengiriman : 'TJR').trim().toUpperCase(),
    modelSerialUnit: customer.modelSerialUnit || 'ALL'
  };

  let updated: CustomerRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = finalRecord;
  } else {
    updated = [finalRecord, ...current];
  }

  saveStoredCustomers(updated);
  return updated;
}

export function addBulkCustomers(newCustomers: CustomerRecord[]): CustomerRecord[] {
  const current = getStoredCustomers();
  const map = new Map<string, CustomerRecord>();
  
  // Existing first
  current.forEach(c => {
    if (c.namaPelanggan) {
      map.set(c.namaPelanggan.trim().toLowerCase(), c);
    }
  });

  // Overwrite or append with new
  newCustomers.forEach(c => {
    if (c.namaPelanggan && c.namaPelanggan.trim()) {
      const key = c.namaPelanggan.trim().toLowerCase();
      map.set(key, {
        id: map.get(key)?.id || c.id || `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        namaPelanggan: c.namaPelanggan.trim().toUpperCase(),
        nomorPelanggan: (c.nomorPelanggan !== undefined && c.nomorPelanggan !== null ? c.nomorPelanggan : (map.get(key)?.nomorPelanggan || '')).trim(),
        jenisSector: (c.jenisSector !== undefined && c.jenisSector !== null ? c.jenisSector : (map.get(key)?.jenisSector || '')).trim().toUpperCase(),
        ketentuanPembayaran: (c.ketentuanPembayaran !== undefined && c.ketentuanPembayaran !== null ? c.ketentuanPembayaran : (map.get(key)?.ketentuanPembayaran || '')).trim().toUpperCase(),
        ketentuanPengiriman: (c.ketentuanPengiriman !== undefined && c.ketentuanPengiriman !== null ? c.ketentuanPengiriman : (map.get(key)?.ketentuanPengiriman || 'TJR')).trim().toUpperCase(),
        modelSerialUnit: c.modelSerialUnit || map.get(key)?.modelSerialUnit || 'ALL'
      });
    }
  });

  const updated = Array.from(map.values());
  saveStoredCustomers(updated);
  return updated;
}

export function deleteCustomerRecord(id: string): CustomerRecord[] {
  const current = getStoredCustomers();
  const updated = current.filter(c => c.id !== id);
  saveStoredCustomers(updated);
  return updated;
}

export function clearCustomerDatabase(): CustomerRecord[] {
  saveStoredCustomers([]);
  return [];
}
