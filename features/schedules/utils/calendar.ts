import { dateKeyFromParts } from "@/features/schedules/utils/dateKey";

export type CalendarDay = {
  year: number;
  month1Based: number;
  day: number;
  dateKey: string;
  inMonth: boolean;
};

function lastDayOfMonth(year: number, month1Based: number) {
  return new Date(year, month1Based, 0).getDate();
}

export function buildMonthGrid(year: number, month1Based: number): CalendarDay[] {
  const first = new Date(year, month1Based - 1, 1);
  const firstDow = first.getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // Monday=0

  const daysInMonth = lastDayOfMonth(year, month1Based);
  const prevMonth = month1Based === 1 ? 12 : month1Based - 1;
  const prevYear = month1Based === 1 ? year - 1 : year;
  const daysInPrevMonth = lastDayOfMonth(prevYear, prevMonth);

  const grid: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - offset + 1;
    if (dayNum < 1) {
      const d = daysInPrevMonth + dayNum;
      grid.push({
        year: prevYear,
        month1Based: prevMonth,
        day: d,
        dateKey: dateKeyFromParts(prevYear, prevMonth, d),
        inMonth: false,
      });
      continue;
    }
    if (dayNum > daysInMonth) {
      const nextMonth = month1Based === 12 ? 1 : month1Based + 1;
      const nextYear = month1Based === 12 ? year + 1 : year;
      const d = dayNum - daysInMonth;
      grid.push({
        year: nextYear,
        month1Based: nextMonth,
        day: d,
        dateKey: dateKeyFromParts(nextYear, nextMonth, d),
        inMonth: false,
      });
      continue;
    }

    grid.push({
      year,
      month1Based,
      day: dayNum,
      dateKey: dateKeyFromParts(year, month1Based, dayNum),
      inMonth: true,
    });
  }

  return grid;
}

export function monthLabel(year: number, month1Based: number) {
  try {
    const d = new Date(year, month1Based - 1, 1);
    return new Intl.DateTimeFormat("es-CO", { year: "numeric", month: "long" })
      .format(d)
      .toLocaleUpperCase("es-CO");
  } catch {
    return `${year}-${String(month1Based).padStart(2, "0")}`;
  }
}

