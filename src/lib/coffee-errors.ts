const KNOWN = [
  "not_allowed", "bad_amount", "bad_kg", "bad_day", "bad_kind", "bad_phone", "bad_status", "overpayment",
  "name_required", "kebele_required", "reason_required", "buyer_required", "farmer_not_found", "grade_not_found",
  "purchase_not_found", "advance_not_found", "lot_not_found", "already_voided", "lot_dispatched", "lot_empty",
] as const;

export type CoffeeErrorKey = (typeof KNOWN)[number] | "grade_exists" | "generic";

/** Turns a database error message into a translation key; anything unknown stays generic. */
export function coffeeErrorKey(message: string | undefined): CoffeeErrorKey {
  return KNOWN.find((code) => message?.includes(code)) ?? "generic";
}
