export function dateKeyFromParts(year: number, month1Based: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month1Based).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateKey(value: string) {
  const [y, m, d] = value.split("-");
  const year = Number(y);
  const month1Based = Number(m);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month1Based) || !Number.isFinite(day)) {
    return null;
  }
  if (month1Based < 1 || month1Based > 12) return null;
  if (day < 1 || day > 31) return null;
  return { year, month1Based, day };
}

