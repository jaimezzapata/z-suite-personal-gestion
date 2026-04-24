import type { Timestamp } from "firebase/firestore";

import type { Currency, PayFrequency, PayType } from "@/features/companies/types";

export type PayPeriodType = "biweekly" | "monthly";
export type BiweeklyPart = 1 | 2;

export type Payslip = {
  id: string;
  companyId: string;
  companyName: string;
  payType: PayType;
  payFrequency: PayFrequency;
  currency: Currency;
  amount: number;
  periodType: PayPeriodType;
  periodKey: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  payDate?: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type PayslipInput = {
  companyId: string;
  companyName: string;
  payType: PayType;
  payFrequency: PayFrequency;
  currency: Currency;
  amount: number;
  periodType: PayPeriodType;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  payDate?: Date;
  notes?: string;
};

