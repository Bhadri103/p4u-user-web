/** Matches commerce `CommerceQueryService.CANCELLABLE_STATUSES`. */
export const ORDER_CANCELLABLE_STATUSES = new Set([
  "created",
  "placed",
  "pending",
  "paid",
  "accepted",
  "processing",
  "in_progress",
  "new",
]);

export function isOrderCancellable(status: unknown): boolean {
  return ORDER_CANCELLABLE_STATUSES.has(String(status || "").trim().toLowerCase());
}

/** Service booking statuses where the customer may still cancel. */
export const BOOKING_CANCELLABLE_STATUSES = new Set([
  "pending",
  "approved",
  "confirmed",
  "in_progress",
]);

export function isBookingCancellable(status: unknown): boolean {
  return BOOKING_CANCELLABLE_STATUSES.has(String(status || "").trim().toLowerCase());
}
