import type { Payslip, PayPeriodType } from "@/features/payslips/types";
import { formatDateWithWeekday } from "@/shared/utils/format";

export function periodLabel(p: Pick<Payslip, "periodStart" | "periodEnd">) {
  return `${formatDateWithWeekday(p.periodStart.toDate())} - ${formatDateWithWeekday(p.periodEnd.toDate())}`;
}

export function periodTypeLabel(t: PayPeriodType) {
  return t === "monthly" ? "Mensual" : "Quincenal";
}
