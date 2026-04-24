import type { Timestamp } from "firebase/firestore";

export type InstitutionKind = "CESDE" | "SENA" | "OTRA";

export type ScheduleEntry = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  institutionKind: InstitutionKind;
  institutionName?: string;
  name: string;
  startMinutes: number; // minutes from 00:00
  endMinutes: number; // minutes from 00:00
  room?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ScheduleEntryInput = {
  dateKey: string;
  institutionKind: InstitutionKind;
  institutionName?: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  room?: string;
};
