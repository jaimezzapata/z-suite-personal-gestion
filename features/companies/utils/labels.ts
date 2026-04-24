import type { PayFrequency, PayType } from "@/features/companies/types";

export function payTypeLabel(type: PayType) {
  if (type === "fixed") return "Fijo";
  return "Por hora";
}

export function payFrequencyLabel(freq: PayFrequency) {
  if (freq === "biweekly") return "Quincenal";
  return "Mensual";
}

