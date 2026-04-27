"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeUserSettings, updateUserSettings } from "@/features/settings/services/userSettingsService";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/features/settings/types";

function isValidPeriod(value: unknown): value is { year: number; month1Based: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  const year = Number(v.year);
  const month1Based = Number(v.month1Based);
  if (!Number.isFinite(year) || year < 1900 || year > 3000) return false;
  if (!Number.isFinite(month1Based) || month1Based < 1 || month1Based > 12) return false;
  return true;
}

function normalizeSettings(raw: unknown): UserSettings {
  const base = DEFAULT_USER_SETTINGS;
  const out: UserSettings = {
    dashboard: { ...base.dashboard },
    schedules: { ...base.schedules },
  };

  if (!raw || typeof raw !== "object") return out;
  const r = raw as any;

  if (r.dashboard && typeof r.dashboard === "object") {
    if (typeof r.dashboard.rememberPeriod === "boolean") out.dashboard.rememberPeriod = r.dashboard.rememberPeriod;
    if (typeof r.dashboard.showSavingsAll === "boolean") out.dashboard.showSavingsAll = r.dashboard.showSavingsAll;
    if (isValidPeriod(r.dashboard.lastPeriod)) out.dashboard.lastPeriod = r.dashboard.lastPeriod;
  }

  if (r.schedules && typeof r.schedules === "object") {
    if (r.schedules.defaultInstitutionKind === "CESDE" || r.schedules.defaultInstitutionKind === "SENA" || r.schedules.defaultInstitutionKind === "OTRA") {
      out.schedules.defaultInstitutionKind = r.schedules.defaultInstitutionKind;
    }
    if (typeof r.schedules.defaultOtherInstitutionName === "string") {
      out.schedules.defaultOtherInstitutionName = r.schedules.defaultOtherInstitutionName;
    }
  }

  return out;
}

export function useUserSettings(uid: string) {
  const [raw, setRaw] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeUserSettings(
      uid,
      (v) => {
        setRaw(v);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  const settings = useMemo(() => normalizeSettings(raw), [raw]);

  return {
    settings,
    loading,
    error,
    update: (patch: Partial<UserSettings>) => updateUserSettings(uid, patch),
  };
}

