export type ServiceWishlistItem = {
  id: string;
  title: string;
  image?: string;
  provider?: string;
  price?: number;
  duration?: string;
  vendorId?: string;
  savedAt: string;
};

const STORAGE_KEY = "p4u_service_wishlist";

function read(): ServiceWishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function write(rows: ServiceWishlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore storage failures
  }
}

export function getServiceWishlist(): ServiceWishlistItem[] {
  return read();
}

export function isServiceWishlisted(serviceId: string | number): boolean {
  const key = String(serviceId);
  return read().some((row) => row.id === key);
}

export function addServiceWishlist(item: Omit<ServiceWishlistItem, "savedAt">): ServiceWishlistItem[] {
  const key = String(item.id);
  const rows = read().filter((row) => row.id !== key);
  rows.unshift({ ...item, id: key, savedAt: new Date().toISOString() });
  write(rows);
  return rows;
}

export function removeServiceWishlist(serviceId: string | number): ServiceWishlistItem[] {
  const key = String(serviceId);
  const rows = read().filter((row) => row.id !== key);
  write(rows);
  return rows;
}
