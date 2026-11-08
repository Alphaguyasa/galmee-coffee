import { addDays } from "@/lib/day";
import { parseGregorian, toEthiopian, toGregorian } from "@/lib/ethiopian-date";

export const PERIODS = ["today", "week", "month"] as const;
export type Period = (typeof PERIODS)[number];

const pad = (n: number) => String(n).padStart(2, "0");

/** Date range for a report: today, the week since Monday, or the current Ethiopian month. */
export function periodRange(period: Period, today: string): { from: string; to: string } {
  if (period === "today") return { from: today, to: today };
  if (period === "week") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    return { from: addDays(today, -((weekday + 6) % 7)), to: today };
  }
  const et = toEthiopian(parseGregorian(today));
  const g = toGregorian({ year: et.year, month: et.month, day: 1 });
  return { from: `${g.year}-${pad(g.month)}-${pad(g.day)}`, to: today };
}

/** Quotes a CSV cell and defuses spreadsheet formulas in names typed by users. */
export function csvCell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
