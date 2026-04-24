import { parseDateKey } from "@/features/schedules/utils/dateKey";

function toUtcDate(dateKey: string) {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month1Based - 1, parts.day, 0, 0, 0));
}

function toDateKeyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function iterateDateKeysInclusive(startKey: string, endKey: string) {
  const start = toUtcDate(startKey);
  const end = toUtcDate(endKey);
  if (!start || !end) return [];
  if (start.getTime() > end.getTime()) return [];

  const out: string[] = [];
  const d = new Date(start.getTime());
  while (d.getTime() <= end.getTime()) {
    out.push(toDateKeyUTC(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Mon ... 7=Sun

export function weekdayFromDateKey(dateKey: string): Weekday | null {
  const d = toUtcDate(dateKey);
  if (!d) return null;
  const dow = d.getUTCDay(); // 0=Sun
  const mon0 = (dow + 6) % 7; // Mon=0
  return (mon0 + 1) as Weekday;
}

