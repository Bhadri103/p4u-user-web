import { catalogApi } from "@/lib/api/catalog";

/**
 * Resolve a vendor for booking:
 * 1) Explicit vendor on the service row / metadata
 * 2) `GET .../browse/services/:id/vendors` (`catalog_vendor_services`)
 * 3) Legacy: catalog search for a product with matching `serviceId` or name
 */
export async function resolveVendorIdForCatalogService(
  serviceId: string | number,
  title: string,
  explicitVendorId?: string,
): Promise<string | null> {
  const v = explicitVendorId?.trim();
  if (v) return v;

  const sid = String(serviceId);
  try {
    const offers = await catalogApi.getServiceVendorOffers(sid);
    if (Array.isArray(offers) && offers.length > 0) {
      const first = offers.find((o) => o.vendor?.id);
      if (first?.vendor?.id) return String(first.vendor.id);
    }
  } catch {
    /* route may be unavailable; fall back to search */
  }

  const q = String(title ?? "").trim().slice(0, 80);
  if (!q) return null;

  try {
    const raw = await catalogApi.search(q, { limit: 40 });
    const items = Array.isArray(raw) ? raw : (raw as { data?: unknown }).data;
    if (!Array.isArray(items)) return null;

    const byService = items.find(
      (x: Record<string, unknown>) =>
        x?.type === "product" &&
        x?.serviceId != null &&
        String(x.serviceId) === sid,
    ) as { vendorId?: string | null } | undefined;
    if (byService?.vendorId) return String(byService.vendorId);

    const byName = items.find(
      (x: Record<string, unknown>) =>
        x?.type === "product" &&
        typeof x.name === "string" &&
        x.name.toLowerCase() === q.toLowerCase(),
    ) as { vendorId?: string | null } | undefined;
    if (byName?.vendorId) return String(byName.vendorId);

    const anyProduct = items.find((x: Record<string, unknown>) => x?.type === "product") as
      | { vendorId?: string | null }
      | undefined;
    return anyProduct?.vendorId ? String(anyProduct.vendorId) : null;
  } catch {
    return null;
  }
}
