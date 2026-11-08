/**
 * Ethiopian (Ge'ez) calendar helpers.
 *
 * The database stores Gregorian dates; the UI shows Ethiopian dates.
 * Conversion goes through the Julian Day Number (JDN). Ethiopian years have
 * 12 months of 30 days plus Pagume (5 days, 6 in a leap year: E.C. year % 4 === 3).
 */

import type { Locale } from "@/i18n/config";

export type EthiopianDate = { year: number; month: number; day: number };
export type GregorianDate = { year: number; month: number; day: number };

const ETHIOPIC_OFFSET = 1723856;
const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000; // Africa/Addis_Ababa is UTC+3, no DST

export const ETHIOPIAN_MONTHS: Record<Locale, readonly string[]> = {
  am: ["መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"],
  om: ["Fulbaana", "Onkoloolessa", "Sadaasa", "Mudde", "Amajjii", "Guraandhala", "Bitootessa", "Ebla", "Caamsaa", "Waxabajjii", "Adoolessa", "Hagayya", "Qaammee"],
  en: ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"],
};

const ERA_SUFFIX: Record<Locale, string> = { am: "ዓ.ም.", om: "ALI", en: "E.C." };

function floorDiv(a: number, b: number) {
  return Math.floor(a / b);
}

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export function gregorianToJdn({ year, month, day }: GregorianDate): number {
  const a = floorDiv(14 - month, 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + floorDiv(153 * m + 2, 5) + 365 * y + floorDiv(y, 4) - floorDiv(y, 100) + floorDiv(y, 400) - 32045;
}

export function jdnToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044;
  const b = floorDiv(4 * a + 3, 146097);
  const c = a - floorDiv(146097 * b, 4);
  const d = floorDiv(4 * c + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv(5 * e + 2, 153);
  return {
    day: e - floorDiv(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * floorDiv(m, 10),
    year: 100 * b + d - 4800 + floorDiv(m, 10),
  };
}

export function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = mod(jdn - ETHIOPIC_OFFSET, 1461);
  const n = mod(r, 365) + 365 * floorDiv(r, 1460);
  return {
    year: 4 * floorDiv(jdn - ETHIOPIC_OFFSET, 1461) + floorDiv(r, 365) - floorDiv(r, 1460),
    month: floorDiv(n, 30) + 1,
    day: mod(n, 30) + 1,
  };
}

export function ethiopianToJdn({ year, month, day }: EthiopianDate): number {
  return ETHIOPIC_OFFSET + 365 + 365 * (year - 1) + floorDiv(year, 4) + 30 * month + day - 31;
}

export function isEthiopianLeapYear(year: number) {
  return mod(year, 4) === 3;
}

export function toEthiopian(g: GregorianDate): EthiopianDate {
  return jdnToEthiopian(gregorianToJdn(g));
}

export function toGregorian(e: EthiopianDate): GregorianDate {
  return jdnToGregorian(ethiopianToJdn(e));
}

/** Accepts a Date (read in Addis Ababa time) or an ISO string ('2026-11-06' or a timestamp). */
export function parseGregorian(input: Date | string): GregorianDate {
  if (typeof input === "string") {
    const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (plain) return { year: +plain[1], month: +plain[2], day: +plain[3] };
    input = new Date(input);
  }
  if (Number.isNaN(input.getTime())) throw new RangeError("Invalid date");
  const addis = new Date(input.getTime() + ADDIS_OFFSET_MS);
  return { year: addis.getUTCFullYear(), month: addis.getUTCMonth() + 1, day: addis.getUTCDate() };
}

export function formatEthiopianDate(
  input: Date | string,
  locale: Locale = "am",
  { withEra = true }: { withEra?: boolean } = {},
): string {
  const { year, month, day } = toEthiopian(parseGregorian(input));
  const text = `${ETHIOPIAN_MONTHS[locale][month - 1]} ${day}, ${year}`;
  return withEra ? `${text} ${ERA_SUFFIX[locale]}` : text;
}

/** Whole days from `from` (default: today in Addis) to `to`. Negative when `to` is in the past. */
export function daysBetween(to: Date | string, from: Date | string = new Date()): number {
  return gregorianToJdn(parseGregorian(to)) - gregorianToJdn(parseGregorian(from));
}
