import type { Timestamp } from "firebase/firestore";

export type PayType = "fixed" | "hourly";
export type PayFrequency = "biweekly" | "monthly";
export type Currency = "COP" | "USD";

export type Company = {
  id: string;
  name: string;
  payType: PayType;
  payFrequency: PayFrequency;
  hourlyRate?: number;
  fixedSalary?: number;
  currency: Currency;
  active: boolean;
  contractStartDate?: Timestamp;
  contractEndDate?: Timestamp | null;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CompanyInput = {
  name: string;
  payType: PayType;
  payFrequency: PayFrequency;
  hourlyRate?: number;
  fixedSalary?: number;
  currency: Currency;
  active: boolean;
  contractStartDate?: Date;
  contractEndDate?: Date | null;
  notes?: string;
};
