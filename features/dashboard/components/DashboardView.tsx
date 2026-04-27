"use client";

import { BarChart3, CreditCard, PiggyBank, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { usePayslips } from "@/features/payslips/hooks/usePayslips";
import type { Payslip } from "@/features/payslips/types";
import { useScheduleEntries } from "@/features/schedules/hooks/useScheduleEntries";
import { dateKeyFromParts } from "@/features/schedules/utils/dateKey";
import { minutesPerHourUnit } from "@/features/schedules/utils/time";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { useCurrentUser } from "@/shared/auth/CurrentUserContext";
import { isDarkHex, isValidHex, normalizeHex } from "@/shared/utils/color";
import { formatDateKeyWithWeekday, formatMoney } from "@/shared/utils/format";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(year: number, month1Based: number) {
  return `${year}-${pad2(month1Based)}`;
}

function monthLabelEs(month1Based: number) {
  return (
    [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ][month1Based - 1] ?? "—"
  );
}

function sumPayslips(payslips: Payslip[]) {
  return payslips.reduce((acc, p) => acc + Number(p.amount || 0), 0);
}

function lastDayOfMonth(year: number, month1Based: number) {
  return new Date(year, month1Based, 0).getDate();
}

function dateKeyFromDate(d: Date) {
  return dateKeyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekMonday(date: Date) {
  const day = date.getDay(); // 0=Sun..6=Sat
  const offset = (day + 6) % 7; // Mon=0..Sun=6
  return addDays(date, -offset);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type HoursByInstitution = Array<{ label: string; hours: number }>;

function computeHoursSummary(
  entries: Array<{
    institutionKind: "CESDE" | "SENA" | "OTRA";
    institutionName?: string;
    startMinutes: number;
    endMinutes: number;
  }>,
) {
  let total = 0;
  const by = new Map<string, number>();
  for (const e of entries) {
    const minutes = Math.max(0, (e.endMinutes ?? 0) - (e.startMinutes ?? 0));
    const unit = minutesPerHourUnit(e.institutionKind);
    const hours = minutes / unit;
    total += hours;
    const label =
      e.institutionKind === "OTRA"
        ? (e.institutionName?.trim() ? e.institutionName.trim().toUpperCase() : "OTRA")
        : e.institutionKind;
    by.set(label, (by.get(label) ?? 0) + hours);
  }
  const byInstitution: HoursByInstitution = [...by.entries()]
    .map(([label, hours]) => ({ label, hours: round2(hours) }))
    .sort((a, b) => b.hours - a.hours);

  return { totalHours: round2(total), byInstitution };
}

function computeHoursTotalForKind(
  entries: Array<{
    institutionKind: "CESDE" | "SENA" | "OTRA";
    startMinutes: number;
    endMinutes: number;
  }>,
  kind: "CESDE" | "SENA" | "OTRA",
) {
  let total = 0;
  for (const e of entries) {
    if (e.institutionKind !== kind) continue;
    const minutes = Math.max(0, (e.endMinutes ?? 0) - (e.startMinutes ?? 0));
    const unit = minutesPerHourUnit(kind);
    total += minutes / unit;
  }
  return round2(total);
}

function getCompanyChartColor(company: { colorHex?: string; colorKey?: string }) {
  const hex = company.colorHex?.trim() ? normalizeHex(company.colorHex) : "";
  if (hex && isValidHex(hex)) return { color: hex, dark: isDarkHex(hex) };
  if (company.colorKey === "postit-yellow") return { color: "var(--postit-yellow)", dark: false };
  if (company.colorKey === "postit-blue") return { color: "var(--postit-blue)", dark: false };
  if (company.colorKey === "postit-green") return { color: "var(--postit-green)", dark: false };
  if (company.colorKey === "postit-purple") return { color: "var(--postit-purple)", dark: false };
  if (company.colorKey === "postit-pink") return { color: "var(--postit-pink)", dark: false };
  return { color: "var(--postit-blue)", dark: false };
}

function Sparkline({ values }: { values: number[] }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(true), []);
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 36;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
    const y = h - (v / max) * (h - 2) - 1;
    return { x, y };
  });

  const dLine =
    pts.length >= 2
      ? `M ${pts[0]!.x} ${pts[0]!.y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")
      : `M 1 ${h - 1} L ${w - 1} ${h - 1}`;

  const dArea =
    pts.length >= 2
      ? `${dLine} L ${w - 1} ${h - 1} L 1 ${h - 1} Z`
      : `M 1 ${h - 1} L ${w - 1} ${h - 1} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={dArea} fill="url(#sparkFill)" opacity={animate ? 1 : 0} style={{ transition: "opacity 700ms ease-out" }} />
      <path
        d={dLine}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={animate ? 0 : 100}
        style={{ transition: "stroke-dashoffset 900ms ease-out" }}
      />
    </svg>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(true), []);
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-2">
      {items.map((i) => {
        const w = (i.value / max) * 100;
        return (
          <div key={i.label} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                  {i.label}
                </div>
                <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {formatMoney(i.value, "COP")}
                </div>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: animate ? `${w}%` : "0%",
                    backgroundColor: i.color,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RingGauge({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(true), []);

  const v = Number.isFinite(value) ? Math.max(0, value) : 0;
  const m = Number.isFinite(max) ? Math.max(0, max) : 0;
  const pct = m <= 0 ? 0 : Math.min(1, v / m);
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = c;
  const offset = animate ? c * (1 - pct) : c;

  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="6"
        opacity="0.55"
      />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        transform="rotate(-90 20 20)"
      />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="var(--color-foreground)"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function CategoryBarList({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(true), []);
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-2">
      {items.map((i) => {
        const w = (i.value / max) * 100;
        return (
          <div key={i.label} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                  {i.label}
                </div>
                <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  {formatMoney(i.value, "COP")}
                </div>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: animate ? `${w}%` : "0%",
                    backgroundColor: "var(--primary)",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(true), []);

  const total = items.reduce((acc, i) => acc + i.value, 0);
  const r = 16;
  const c = 2 * Math.PI * r;
  const stroke = 6;

  let accLen = 0;
  const segments = items
    .filter((i) => i.value > 0)
    .map((i) => {
      const len = total > 0 ? (i.value / total) * c : 0;
      const startOffset = -accLen;
      accLen += len;
      return { ...i, len, startOffset };
    })
    .filter((s) => s.len > 0);

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 40 40" className="h-24 w-24">
        <g
          style={{
            transformOrigin: "20px 20px",
            transform: animate ? "scale(1)" : "scale(0.94)",
            opacity: animate ? 1 : 0,
            transition: "transform 600ms ease-out, opacity 600ms ease-out",
          }}
        >
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={stroke}
            opacity="0.6"
          />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${animate ? s.len : 0} ${c - s.len}`}
              strokeDashoffset={s.startOffset}
              transform="rotate(-90 20 20)"
              style={{ transition: "stroke-dasharray 900ms ease-out" }}
            />
          ))}
        </g>
        <text
          x="20"
          y="22"
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fill="var(--color-foreground)"
        >
          {total > 0 ? "100%" : "0%"}
        </text>
      </svg>
    </div>
  );
}

export function DashboardView() {
  const { uid } = useCurrentUser();
  const { settings, loading: settingsLoading, update: updateSettings } = useUserSettings(uid);
  const { companies, loading: companiesLoading } = useCompanies(uid);
  const { payslips, loading: payslipsLoading } = usePayslips(uid);
  const { expenses, loading: expensesLoading } = useExpenses(uid);

  const [period, setPeriod] = useState<{ year: number; month1Based: number }>({
    year: 2000,
    month1Based: 1,
  });
  const [todayKey, setTodayKey] = useState<string>("2000-01-01");
  const [hoursBaseKey, setHoursBaseKey] = useState<string>("2000-01-01");
  const [hoursTab, setHoursTab] = useState<"day" | "week" | "biweekly" | "month">("day");
  const [appliedSettings, setAppliedSettings] = useState(false);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month1Based = now.getMonth() + 1;
    setPeriod({ year, month1Based });
    setTodayKey(dateKeyFromDate(now));
    setHoursBaseKey(dateKeyFromDate(now));
  }, []);

  useEffect(() => {
    if (settingsLoading) return;
    if (appliedSettings) return;
    setAppliedSettings(true);

    if (settings.dashboard.rememberPeriod && settings.dashboard.lastPeriod) {
      setPeriod(settings.dashboard.lastPeriod);
      setHoursBaseKey(`${monthKey(settings.dashboard.lastPeriod.year, settings.dashboard.lastPeriod.month1Based)}-01`);
    }
  }, [appliedSettings, settings.dashboard.lastPeriod, settings.dashboard.rememberPeriod, settingsLoading]);

  useEffect(() => {
    if (!appliedSettings) return;
    if (!settings.dashboard.rememberPeriod) return;
    void updateSettings({
      dashboard: { ...settings.dashboard, lastPeriod: { year: period.year, month1Based: period.month1Based } },
    });
  }, [appliedSettings, period.month1Based, period.year, settings.dashboard, settings.dashboard.rememberPeriod, updateSettings]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = dateKeyFromDate(new Date());
      setTodayKey((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const key = monthKey(period.year, period.month1Based);
    if (!hoursBaseKey.startsWith(key)) {
      setHoursBaseKey(`${key}-01`);
    }
  }, [hoursBaseKey, period.month1Based, period.year]);

  const hoursBaseParts = useMemo(() => {
    const [y, m, d] = hoursBaseKey.split("-");
    const year = Number(y);
    const month1Based = Number(m);
    const day = Number(d);
    return { year, month1Based, day };
  }, [hoursBaseKey]);

  const weekRange = useMemo(() => {
    const base = new Date(
      hoursBaseParts.year,
      hoursBaseParts.month1Based - 1,
      hoursBaseParts.day,
      12,
      0,
      0,
    );
    const start = startOfWeekMonday(base);
    const end = addDays(start, 6);
    return { startKey: dateKeyFromDate(start), endKey: dateKeyFromDate(end) };
  }, [hoursBaseParts.day, hoursBaseParts.month1Based, hoursBaseParts.year]);

  const biweeklyRange = useMemo(() => {
    const startDay = hoursBaseParts.day <= 15 ? 1 : 16;
    const endDay =
      hoursBaseParts.day <= 15
        ? 15
        : lastDayOfMonth(hoursBaseParts.year, hoursBaseParts.month1Based);
    return {
      startKey: dateKeyFromParts(hoursBaseParts.year, hoursBaseParts.month1Based, startDay),
      endKey: dateKeyFromParts(hoursBaseParts.year, hoursBaseParts.month1Based, endDay),
    };
  }, [hoursBaseParts.day, hoursBaseParts.month1Based, hoursBaseParts.year]);

  const monthRange = useMemo(() => {
    const last = lastDayOfMonth(hoursBaseParts.year, hoursBaseParts.month1Based);
    return {
      startKey: dateKeyFromParts(hoursBaseParts.year, hoursBaseParts.month1Based, 1),
      endKey: dateKeyFromParts(hoursBaseParts.year, hoursBaseParts.month1Based, last),
    };
  }, [hoursBaseParts.month1Based, hoursBaseParts.year]);

  const dayRange = useMemo(() => ({ startKey: todayKey, endKey: todayKey }), [todayKey]);

  const daySchedules = useScheduleEntries(uid, dayRange);
  const weekSchedules = useScheduleEntries(uid, weekRange);
  const biweeklySchedules = useScheduleEntries(uid, biweeklyRange);
  const monthSchedules = useScheduleEntries(uid, monthRange);

  const loading =
    companiesLoading ||
    payslipsLoading ||
    expensesLoading ||
    daySchedules.loading ||
    weekSchedules.loading ||
    biweeklySchedules.loading ||
    monthSchedules.loading;

  const { filteredPayslips, monthIncome } = useMemo(() => {
    const key = monthKey(period.year, period.month1Based);
    const filtered = payslips.filter((p) => p.periodKey.startsWith(`${key}-`));
    return { filteredPayslips: filtered, monthIncome: sumPayslips(filtered) };
  }, [payslips, period.year, period.month1Based]);

  const { monthExpenses, expensesByCategory } = useMemo(() => {
    const filtered = expenses.filter((e) => {
      const d = e.date.toDate();
      return d.getFullYear() === period.year && d.getMonth() + 1 === period.month1Based;
    });
    const total = filtered.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const by = new Map<string, number>();
    for (const e of filtered) by.set(e.category, (by.get(e.category) ?? 0) + e.amount);
    const items = [...by.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
    return { monthExpenses: total, expensesByCategory: items };
  }, [expenses, period.year, period.month1Based]);

  const { savingsAll } = useMemo(() => {
    const incomeAll = sumPayslips(payslips);
    const expensesAll = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    return { savingsAll: incomeAll - expensesAll };
  }, [expenses, payslips]);

  const monthSavings = useMemo(() => monthIncome - monthExpenses, [monthExpenses, monthIncome]);

  const spendPct = useMemo(() => {
    if (!Number.isFinite(monthIncome) || monthIncome <= 0) return 0;
    const pct = monthExpenses / monthIncome;
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, Math.min(1, pct));
  }, [monthExpenses, monthIncome]);

  const incomeByCompany = useMemo(() => {
    const by = new Map<string, number>();
    for (const p of filteredPayslips) {
      by.set(p.companyId, (by.get(p.companyId) ?? 0) + p.amount);
    }
    const rows = [...by.entries()]
      .map(([companyId, value]) => {
        const c = companies.find((x) => x.id === companyId);
        const label = c?.name ?? "—";
        const { color } = getCompanyChartColor(c ?? {});
        return { label, value, color };
      })
      .sort((a, b) => b.value - a.value);
    return rows;
  }, [companies, filteredPayslips]);

  const topIncomeByCompany = useMemo(() => incomeByCompany.slice(0, 6), [incomeByCompany]);

  const incomeTrend = useMemo(() => {
    const values: number[] = [];
    let y = period.year;
    let m = period.month1Based;
    for (let i = 0; i < 6; i += 1) {
      const key = monthKey(y, m);
      values.unshift(
        sumPayslips(payslips.filter((p) => p.periodKey.startsWith(`${key}-`))),
      );
      m -= 1;
      if (m <= 0) {
        m = 12;
        y -= 1;
      }
    }
    return values;
  }, [payslips, period.year, period.month1Based]);

  const years = useMemo(() => {
    const now = new Date();
    const current = now.getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const dayTotals = useMemo(() => {
    const cesde = computeHoursTotalForKind(daySchedules.entries, "CESDE");
    const sena = computeHoursTotalForKind(daySchedules.entries, "SENA");
    const all = computeHoursSummary(daySchedules.entries).totalHours;
    return { cesde, sena, all };
  }, [daySchedules.entries]);

  const weekTotals = useMemo(() => {
    const cesde = computeHoursTotalForKind(weekSchedules.entries, "CESDE");
    const sena = computeHoursTotalForKind(weekSchedules.entries, "SENA");
    const all = computeHoursSummary(weekSchedules.entries).totalHours;
    return { cesde, sena, all };
  }, [weekSchedules.entries]);

  const biweeklyTotals = useMemo(() => {
    const cesde = computeHoursTotalForKind(biweeklySchedules.entries, "CESDE");
    const sena = computeHoursTotalForKind(biweeklySchedules.entries, "SENA");
    const all = computeHoursSummary(biweeklySchedules.entries).totalHours;
    return { cesde, sena, all };
  }, [biweeklySchedules.entries]);

  const monthTotals = useMemo(() => {
    const cesde = computeHoursTotalForKind(monthSchedules.entries, "CESDE");
    const sena = computeHoursTotalForKind(monthSchedules.entries, "SENA");
    const all = computeHoursSummary(monthSchedules.entries).totalHours;
    return { cesde, sena, all };
  }, [monthSchedules.entries]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-blue)]">
            <BarChart3 className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Resumen
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              {monthLabelEs(period.month1Based)} {period.year}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={period.month1Based}
            onChange={(e) =>
              setPeriod((p) => ({ ...p, month1Based: Number(e.target.value) }))
            }
            className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {monthLabelEs(i + 1)}
              </option>
            ))}
          </select>
          <select
            value={period.year}
            onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
            className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-green)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-foreground)]">
              Ingresos (mes)
            </div>
            <Wallet className="h-4 w-4 text-[color:var(--color-foreground)]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {loading ? "…" : formatMoney(monthIncome, "COP")}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            {monthLabelEs(period.month1Based)}
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-purple)] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-foreground)]">
                Gastos (mes)
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
                {loading ? "…" : formatMoney(monthExpenses, "COP")}
              </div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
                {Math.round(spendPct * 100)}% de ingresos
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RingGauge value={monthExpenses} max={monthIncome} color="var(--color-foreground)" />
              <CreditCard className="h-4 w-4 text-[color:var(--color-foreground)]" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-foreground)]">
              Ahorro
            </div>
            <PiggyBank className="h-4 w-4 text-[color:var(--color-foreground)]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {loading ? "…" : formatMoney(settings.dashboard.showSavingsAll ? savingsAll : monthSavings, "COP")}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            {settings.dashboard.showSavingsAll ? "Saldo histórico" : "Saldo del mes"}
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
              Tendencia (6 meses)
            </div>
            <div className="h-4 w-4" />
          </div>
          <div className="mt-1">
            <Sparkline values={incomeTrend} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                Ingresos por empresa
              </div>
              <div className="text-xs text-[color:var(--color-muted)]">
                Colillas del periodo
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
              Cargando…
            </div>
          ) : incomeByCompany.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <DonutChart items={topIncomeByCompany} />
              <div className="space-y-2">
                {topIncomeByCompany.map((i) => (
                  <div key={i.label} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: i.color }}
                      />
                      <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                        {i.label}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      {formatMoney(i.value, "COP")}
                    </div>
                  </div>
                ))}
                <div className="mt-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--color-muted)]">
                  Total: {formatMoney(monthIncome, "COP")}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
              Aún no hay colillas en este periodo.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                Gastos por categoría
              </div>
              <div className="text-xs text-[color:var(--color-muted)]">
                Total del periodo
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
              Cargando…
            </div>
          ) : expensesByCategory.length ? (
            <div className="space-y-3">
              <CategoryBarList
                items={expensesByCategory.slice(0, 6).map((c) => ({ label: c.category, value: c.value }))}
              />
              <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--color-muted)]">
                Total: {formatMoney(monthExpenses, "COP")}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
              Aún no hay gastos en este periodo.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                Horas (Horarios)
              </div>
              <div className="text-xs text-[color:var(--color-muted)]">
                Resumen rápido (mobile-first).
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[color:var(--color-muted)]">
                  Base (semana/quincena/mes)
                </span>
                <input
                  value={hoursBaseKey}
                  onChange={(e) => setHoursBaseKey(e.target.value)}
                  type="date"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Hoy", value: formatDateKeyWithWeekday(todayKey) },
              {
                label: "Semana",
                value: `${formatDateKeyWithWeekday(weekRange.startKey)} → ${formatDateKeyWithWeekday(weekRange.endKey)}`,
              },
              {
                label: "Quincena",
                value: `${formatDateKeyWithWeekday(biweeklyRange.startKey)} → ${formatDateKeyWithWeekday(biweeklyRange.endKey)}`,
              },
              {
                label: "Mes",
                value: `${formatDateKeyWithWeekday(monthRange.startKey)} → ${formatDateKeyWithWeekday(monthRange.endKey)}`,
              },
            ].map((it) => (
              <div
                key={it.label}
                className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2"
              >
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                  {it.label}
                </div>
                <div className="mt-0.5 break-words text-xs font-semibold text-[color:var(--color-foreground)]">
                  {it.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[color:var(--color-muted)]">
                Periodo (vista móvil)
              </span>
              <select
                value={hoursTab}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "week" || v === "biweekly" || v === "month") setHoursTab(v);
                  else setHoursTab("day");
                }}
                className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              >
                <option value="day">Día (hoy)</option>
                <option value="week">Semana</option>
                <option value="biweekly">Quincena</option>
                <option value="month">Mes</option>
              </select>
            </label>
          </div>
        </div>

        {(daySchedules.error || weekSchedules.error || biweeklySchedules.error || monthSchedules.error) ? (
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
            {(daySchedules.error ?? weekSchedules.error ?? biweeklySchedules.error ?? monthSchedules.error) ?? "Error al leer horarios"}
          </div>
        ) : (
          <>
            <div className="mt-3 lg:hidden">
              {(() => {
                const title =
                  hoursTab === "week" ? "Semana" : hoursTab === "biweekly" ? "Quincena" : hoursTab === "month" ? "Mes" : "Día";
                const sub =
                  hoursTab === "week"
                    ? `${formatDateKeyWithWeekday(weekRange.startKey)} → ${formatDateKeyWithWeekday(weekRange.endKey)}`
                    : hoursTab === "biweekly"
                      ? `${formatDateKeyWithWeekday(biweeklyRange.startKey)} → ${formatDateKeyWithWeekday(biweeklyRange.endKey)}`
                      : hoursTab === "month"
                        ? `${formatDateKeyWithWeekday(monthRange.startKey)} → ${formatDateKeyWithWeekday(monthRange.endKey)}`
                        : formatDateKeyWithWeekday(todayKey);
                const totals =
                  hoursTab === "week"
                    ? weekTotals
                    : hoursTab === "biweekly"
                      ? biweeklyTotals
                      : hoursTab === "month"
                        ? monthTotals
                        : dayTotals;

                return (
                  <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                      {title}
                    </div>
                    <div className="mt-1 break-words text-xs font-semibold text-[color:var(--color-muted)]">
                      {sub}
                    </div>
                    <div className="mt-3 space-y-2">
                      {loading ? (
                        <div className="text-sm font-semibold text-[color:var(--color-muted)]">
                          Cargando…
                        </div>
                      ) : (
                        <>
                          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <div className="font-extrabold text-[color:var(--color-muted)]">
                                TOTAL
                              </div>
                              <div className="font-extrabold text-[color:var(--color-foreground)]">
                                {totals.all} H
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm">
                              <div className="font-semibold text-[color:var(--color-muted)]">
                                CESDE
                              </div>
                              <div className="font-extrabold text-[color:var(--color-foreground)]">
                                {totals.cesde} H
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm">
                              <div className="font-semibold text-[color:var(--color-muted)]">
                                SENA
                              </div>
                              <div className="font-extrabold text-[color:var(--color-foreground)]">
                                {totals.sena} H
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-3 hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4">
              {[
                { title: "Día", totals: dayTotals, sub: formatDateKeyWithWeekday(todayKey) },
                {
                  title: "Semana",
                  totals: weekTotals,
                  sub: `${formatDateKeyWithWeekday(weekRange.startKey)} → ${formatDateKeyWithWeekday(weekRange.endKey)}`,
                },
                {
                  title: "Quincena",
                  totals: biweeklyTotals,
                  sub: `${formatDateKeyWithWeekday(biweeklyRange.startKey)} → ${formatDateKeyWithWeekday(biweeklyRange.endKey)}`,
                },
                {
                  title: "Mes",
                  totals: monthTotals,
                  sub: `${formatDateKeyWithWeekday(monthRange.startKey)} → ${formatDateKeyWithWeekday(monthRange.endKey)}`,
                },
              ].map(({ title, totals, sub }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm"
                >
                  <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                    {title}
                  </div>
                  <div className="mt-1 break-words text-xs font-semibold text-[color:var(--color-muted)]">
                    {sub}
                  </div>
                  <div className="mt-3 space-y-1">
                    {loading ? (
                      <div className="text-sm font-semibold text-[color:var(--color-muted)]">
                        Cargando…
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="font-semibold text-[color:var(--color-muted)]">
                            CESDE
                          </div>
                          <div className="font-extrabold text-[color:var(--color-foreground)]">
                            {totals.cesde} H
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="font-semibold text-[color:var(--color-muted)]">
                            SENA
                          </div>
                          <div className="font-extrabold text-[color:var(--color-foreground)]">
                            {totals.sena} H
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm">
                          <div className="font-extrabold text-[color:var(--color-muted)]">
                            TOTAL
                          </div>
                          <div className="font-extrabold text-[color:var(--color-foreground)]">
                            {totals.all} H
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
