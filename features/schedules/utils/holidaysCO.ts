import { dateKeyFromParts } from "@/features/schedules/utils/dateKey";

function toUtcDate(year: number, month1Based: number, day: number) {
  return new Date(Date.UTC(year, month1Based - 1, day, 0, 0, 0));
}

function fromUtcDate(d: Date) {
  return {
    year: d.getUTCFullYear(),
    month1Based: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function addDaysUTC(d: Date, days: number) {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function moveToNextMondayUTC(d: Date) {
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon
  if (dow === 1) return d;
  const delta = (8 - dow) % 7;
  return addDaysUTC(d, delta === 0 ? 7 : delta);
}

function easterSundayUTC(year: number) {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toUtcDate(year, month, day);
}

export function colombiaHolidayDateKeys(year: number) {
  const out = new Set<string>();

  // Fixed (no move)
  const fixed = [
    { m: 1, d: 1 },   // Año Nuevo
    { m: 5, d: 1 },   // Día del Trabajo
    { m: 7, d: 20 },  // Independencia
    { m: 8, d: 7 },   // Batalla de Boyacá
    { m: 12, d: 8 },  // Inmaculada Concepción
    { m: 12, d: 25 }, // Navidad
  ];
  for (const f of fixed) out.add(dateKeyFromParts(year, f.m, f.d));

  // Emiliani (moved to next Monday)
  const emiliani = [
    { m: 1, d: 6 },   // Reyes Magos
    { m: 3, d: 19 },  // San José
    { m: 6, d: 29 },  // San Pedro y San Pablo
    { m: 8, d: 15 },  // Asunción
    { m: 10, d: 12 }, // Día de la Raza
    { m: 11, d: 1 },  // Todos los Santos
    { m: 11, d: 11 }, // Independencia de Cartagena
  ];
  for (const f of emiliani) {
    const moved = moveToNextMondayUTC(toUtcDate(year, f.m, f.d));
    const p = fromUtcDate(moved);
    out.add(dateKeyFromParts(p.year, p.month1Based, p.day));
  }

  // Easter-based
  const easter = easterSundayUTC(year);
  // Jueves Santo (Thursday before Easter)
  {
    const d = addDaysUTC(easter, -3);
    const p = fromUtcDate(d);
    out.add(dateKeyFromParts(p.year, p.month1Based, p.day));
  }
  // Viernes Santo (Friday before Easter)
  {
    const d = addDaysUTC(easter, -2);
    const p = fromUtcDate(d);
    out.add(dateKeyFromParts(p.year, p.month1Based, p.day));
  }

  // Ascensión (39 days after Easter) -> moved to next Monday
  {
    const d = moveToNextMondayUTC(addDaysUTC(easter, 39));
    const p = fromUtcDate(d);
    out.add(dateKeyFromParts(p.year, p.month1Based, p.day));
  }
  // Corpus Christi (60 days after Easter) -> moved to next Monday
  {
    const d = moveToNextMondayUTC(addDaysUTC(easter, 60));
    const p = fromUtcDate(d);
    out.add(dateKeyFromParts(p.year, p.month1Based, p.day));
  }
  // Sagrado Corazón (68 days after Easter) -> moved to next Monday
  {
    const d = moveToNextMondayUTC(addDaysUTC(easter, 68));
    const p = fromUtcDate(d);
    out.add(dateKeyFromParts(p.year, p.month1Based, p.day));
  }

  return out;
}

export function colombiaHolidayDateKeysForRange(startYear: number, endYear: number) {
  const out = new Set<string>();
  for (let y = startYear; y <= endYear; y++) {
    for (const k of colombiaHolidayDateKeys(y)) out.add(k);
  }
  return out;
}

