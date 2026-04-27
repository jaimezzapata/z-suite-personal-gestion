"use client";

export type UserSettings = {
  dashboard: {
    rememberPeriod: boolean;
    lastPeriod?: { year: number; month1Based: number };
    showSavingsAll: boolean;
  };
  schedules: {
    defaultInstitutionKind: "CESDE" | "SENA" | "OTRA";
    defaultOtherInstitutionName: string;
  };
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dashboard: {
    rememberPeriod: false,
    showSavingsAll: true,
  },
  schedules: {
    defaultInstitutionKind: "CESDE",
    defaultOtherInstitutionName: "OTRA",
  },
};

