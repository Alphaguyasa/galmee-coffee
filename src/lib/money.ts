import type { Locale } from "@/i18n/config";

const NUMBER = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Birr for display only: all money math happens in the database. */
export function formatBirr(amount: number, locale: Locale): string {
  const text = NUMBER.format(amount);
  return locale === "am" ? `ብር ${text}` : `${text} ETB`;
}

const KG = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Kilos for display, without a unit. */
export function formatKg(kg: number): string {
  return KG.format(kg);
}

/** Amount shown while typing, before the database records the real figure. Works in cents so floats do not leak. */
export function previewAmount(kg: number, pricePerKg: number): number {
  return (Math.round(kg * 100) * Math.round(pricePerKg * 100)) / 10_000;
}
