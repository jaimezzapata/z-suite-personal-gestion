import { Timestamp } from "firebase/firestore";

export function parseISODateInput(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function toISODateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function timestampToISODateInput(ts: Timestamp): string {
  return toISODateInput(ts.toDate());
}

