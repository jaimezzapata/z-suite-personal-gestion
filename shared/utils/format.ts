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
