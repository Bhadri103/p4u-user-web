/** Parses numeric price from API strings/decimals (handles commas). */
export function parseMoney(v: unknown): number {
  if (v == null || v === "") return 0;
  const x = Number.parseFloat(String(v).trim().replace(/,/g, ""));
  return Number.isFinite(x) ? x : 0;
}

/**
 * Catalog products expose sellPrice, finalPrice, and legacy price.
 * Admin often sets only sellPrice; finalPrice may remain 0 — `??` would still pick 0 over sellPrice.
 * Use this helper anywhere we display or cart a unit price.
 */
export function resolveCatalogUnitPrice(row: Record<string, unknown>): number {
  const parse = (v: unknown): number => {
    if (v == null || v === "") return NaN;
    const s = String(v).trim().replace(/,/g, "");
    const x = Number.parseFloat(s);
    return Number.isFinite(x) ? x : NaN;
  };

  const fp = parse(row.finalPrice);
  const sp = parse(row.sellPrice);
  const bp = parse(row.price);

  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const mfp = parse(meta.finalPrice);
  const msp = parse(meta.sellPrice);
  const mp = parse(meta.price);

  if (Number.isFinite(fp) && fp > 0) return fp;
  if (Number.isFinite(mfp) && mfp > 0) return mfp;
  if (Number.isFinite(sp) && sp > 0) return sp;
  if (Number.isFinite(msp) && msp > 0) return msp;
  if (Number.isFinite(bp) && bp > 0) return bp;
  if (Number.isFinite(mp) && mp > 0) return mp;

  if (Number.isFinite(fp)) return fp;
  if (Number.isFinite(sp)) return sp;
  if (Number.isFinite(bp)) return bp;
  return 0;
}

/** List/original price for strikethrough: prefer sell when it exceeds the effective unit price. */
export function resolveCatalogDisplayOriginal(row: Record<string, unknown>, unitPrice: number): number {
  const sell = parseMoney(row.sellPrice);
  if (sell > unitPrice) return sell;
  const meta = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, unknown>)
    : {};
  const o = parseMoney(meta.originalPrice ?? meta.mrp);
  if (o > unitPrice) return o;
  return unitPrice;
}
