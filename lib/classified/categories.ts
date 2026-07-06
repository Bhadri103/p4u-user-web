import { classifiedApi, type ClassifiedCategory } from "@/lib/api/classified";

/** Classified ad categories only (admin → Configuration → CF Categories). Not shop product categories. */
export function sortClassifiedCategories(rows: ClassifiedCategory[]): ClassifiedCategory[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export async function loadClassifiedCategories(options?: { forceRefresh?: boolean }): Promise<ClassifiedCategory[]> {
  const res = await classifiedApi.categories({ forceRefresh: options?.forceRefresh ?? true });
  return sortClassifiedCategories(res.items);
}
