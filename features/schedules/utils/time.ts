import type { InstitutionKind } from "@/features/schedules/types";

export function minutesPerHourUnit(kind: InstitutionKind) {
  if (kind === "CESDE") return 45;
  return 60;
}

export function timeToMinutes(value: string) {
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTime(value: number) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatHoursForInstitution(minutes: number, kind: InstitutionKind) {
  const unit = minutesPerHourUnit(kind);
  const hours = minutes / unit;
  return Math.round(hours * 100) / 100;
}

export function formatDurationMinutes(minutes: number) {
  const safe = Math.max(0, Math.floor(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}
