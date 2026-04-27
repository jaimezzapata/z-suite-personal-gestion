import { parseISODateInput } from "@/shared/utils/date";

export function formatMoney(value: number, currency: "COP" | "USD" = "COP") {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "COP" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

export function formatCop(value: number) {
  return formatMoney(value, "COP");
}

export function formatDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
      .format(date)
      .toLocaleUpperCase("es-CO");
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function stripDiacritics(value: string) {
  try {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return value;
  }
}

export function formatWeekdayShort(date: Date) {
  try {
    const raw = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(date);
    return stripDiacritics(raw).toLocaleUpperCase("es-CO").replace(/\./g, "").trim();
  } catch {
    return "";
  }
}

export function formatDateWithWeekday(date: Date) {
  const wd = formatWeekdayShort(date);
  const d = formatDate(date);
  return wd ? `${wd} ${d}` : d;
}

export function formatDateKeyWithWeekday(dateKey: string) {
  const d = parseISODateInput(dateKey);
  if (!d) return dateKey;
  return formatDateWithWeekday(d);
}
