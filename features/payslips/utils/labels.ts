import type { Payslip, PayPeriodType } from "@/features/payslips/types";
import { formatDate } from "@/shared/utils/format";

export function periodLabel(p: Pick<Payslip, "periodStart" | "periodEnd">) {
  return `${formatDate(p.periodStart.toDate())} - ${formatDate(p.periodEnd.toDate())}`;
}

export function periodTypeLabel(t: PayPeriodType) {
  return t === "monthly" ? "Mensual" : "Quincenal";
}

