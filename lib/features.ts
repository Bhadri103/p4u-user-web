/**
 * Feature flags for customer-facing modules.
 * Set NEXT_PUBLIC_FOOD_ENABLED=true to show Food again (code is kept, only hidden).
 */
export const isFoodModuleEnabled =
  String(process.env.NEXT_PUBLIC_FOOD_ENABLED || "").toLowerCase() === "true";
