export type ExpensePeriodType = "biweekly" | "monthly";
export type BiweeklyPart = 1 | 2;

function lastDayOfMonth(year: number, month1Based: number) {
  return new Date(year, month1Based, 0).getDate();
}

export function getBiweeklyRange(
  year: number,
  month1Based: number,
  part: BiweeklyPart,
) {
  if (part === 1) {
    return {
      start: new Date(year, month1Based - 1, 1, 0, 0, 0),
      end: new Date(year, month1Based - 1, 15, 23, 59, 59),
    };
  }
  const last = lastDayOfMonth(year, month1Based);
  return {
    start: new Date(year, month1Based - 1, 16, 0, 0, 0),
    end: new Date(year, month1Based - 1, last, 23, 59, 59),
  };
}

export function getMonthlyRange(year: number, month1Based: number) {
  const last = lastDayOfMonth(year, month1Based);
  return {
    start: new Date(year, month1Based - 1, 1, 0, 0, 0),
    end: new Date(year, month1Based - 1, last, 23, 59, 59),
  };
}

