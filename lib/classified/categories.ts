import { classifiedApi, type ClassifiedCategory } from "@/lib/api/classified";

export const MOBILE_CLASSIFIED_CATEGORIES: ClassifiedCategory[] = [
  "Mobiles",
  "Cars & Bikes",
  "Electronics & Appliances",
  "Furniture",
  "Fashion",
  "Books, Sports & Hobbies",
  "Pets",
  "Agriculture",
  "Business & Industrial",
  "Jobs",
  "Services",
  "Other",
].map((name) => ({ id: name, name }));

/** Classified ad categories only (admin → Configuration → CF Categories). Not shop product categories. */
export function sortClassifiedCategories(rows: ClassifiedCategory[]): ClassifiedCategory[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export async function loadClassifiedCategories(options?: { forceRefresh?: boolean }): Promise<ClassifiedCategory[]> {
  try {
    const res = await classifiedApi.categories({ forceRefresh: options?.forceRefresh ?? true });
    return res.items.length ? sortClassifiedCategories(res.items) : MOBILE_CLASSIFIED_CATEGORIES;
  } catch {
    return MOBILE_CLASSIFIED_CATEGORIES;
  }
}
