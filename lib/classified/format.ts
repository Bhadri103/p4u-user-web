export function formatClassifiedInr(amount: number | string | null | undefined): string {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount ?? "0"));
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
}

export function formatClassifiedShortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatClassifiedLongDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function whatsAppHref(phone: string | null | undefined, message: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function classifiedShareUrl(id: string): string {
  if (typeof window === "undefined") return `/classified/${id}`;
  return `${window.location.origin}/classified/${id}`;
}
