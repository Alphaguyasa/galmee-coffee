const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000; // Africa/Addis_Ababa is UTC+3, no DST

/** Today's date in Addis Ababa as YYYY-MM-DD. */
export function addisToday(now: Date = new Date()): string {
  return new Date(now.getTime() + ADDIS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(day: string, days: number): string {
  const t = Date.parse(`${day}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Clock time in Addis Ababa, HH:MM. */
export function addisTime(iso: string): string {
  return new Date(Date.parse(iso) + ADDIS_OFFSET_MS).toISOString().slice(11, 16);
}
