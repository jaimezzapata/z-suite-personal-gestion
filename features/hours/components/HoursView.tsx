"use client";

import { CalendarDays, Coins } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCompanies } from "@/features/companies/hooks/useCompanies";
import type { Company } from "@/features/companies/types";
import { useScheduleEntries } from "@/features/schedules/hooks/useScheduleEntries";
import { dateKeyFromParts, parseDateKey } from "@/features/schedules/utils/dateKey";
import { minutesPerHourUnit, minutesToTime } from "@/features/schedules/utils/time";
import { useCurrentUser } from "@/shared/auth/CurrentUserContext";
import { formatMoney } from "@/shared/utils/format";
import { normalizeUpper } from "@/shared/utils/text";

function dateKeyFromDate(d: Date) {
  return dateKeyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekMonday(date: Date) {
  const day = date.getDay();
  const offset = (day + 6) % 7;
  return addDays(date, -offset);
}

function lastDayOfMonth(year: number, month1Based: number) {
  return new Date(year, month1Based, 0).getDate();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type MoneyTotals = Partial<Record<Company["currency"], number>>;

function addMoney(acc: MoneyTotals, currency: Company["currency"], amount: number) {
  const prev = acc[currency] ?? 0;
  acc[currency] = prev + amount;
}

function moneyLines(totals: MoneyTotals) {
  const currencies = Object.keys(totals) as Company["currency"][];
  return currencies
    .filter((c) => typeof totals[c] === "number")
    .sort((a, b) => a.localeCompare(b))
    .map((currency) => ({ currency, amount: totals[currency] ?? 0 }));
}

type InstitutionPayRow = {
  label: string;
  hours: number;
  pay: MoneyTotals;
};

function companyForScheduleLabel(companies: Company[], label: string) {
  const key = normalizeUpper(label);
  return companies.find((c) => normalizeUpper(c.name) === key) ?? null;
}

type DetailItem = {
  dateKey: string;
  label: string;
  subject: string;
  startMinutes: number;
  endMinutes: number;
  hours: number;
  currency: Company["currency"];
  payAmount: number;
};

type DetailGroup = {
  dateKey: string;
  totalHours: number;
  totalPay: MoneyTotals;
  items: DetailItem[];
};

function computePaySummary(
  entries: Array<{
    dateKey: string;
    institutionKind: "CESDE" | "SENA" | "OTRA";
    institutionName?: string;
    name: string;
    startMinutes: number;
    endMinutes: number;
  }>,
  hourlyCompanies: Company[],
) {
  const rowsByLabel = new Map<string, InstitutionPayRow>();
  const totalPay: MoneyTotals = {};
  let totalHours = 0;
  const detailsByDate = new Map<string, DetailGroup>();

  for (const e of entries) {
    const label =
      e.institutionKind === "OTRA"
        ? (e.institutionName?.trim() ? normalizeUpper(e.institutionName.trim()) : "OTRA")
        : e.institutionKind;

    const company = companyForScheduleLabel(hourlyCompanies, label);
    if (!company) continue;
    if (company.payType !== "hourly") continue;
    if (typeof company.hourlyRate !== "number" || !Number.isFinite(company.hourlyRate) || company.hourlyRate <= 0) {
      continue;
    }

    const minutes = Math.max(0, (e.endMinutes ?? 0) - (e.startMinutes ?? 0));
    const unit = minutesPerHourUnit(e.institutionKind);
    const hours = minutes / unit;
    totalHours += hours;
    const payAmount = hours * company.hourlyRate;

    const existing = rowsByLabel.get(label) ?? {
      label: company.name,
      hours: 0,
      pay: {},
    };

    existing.hours += hours;
    addMoney(existing.pay, company.currency, payAmount);
    addMoney(totalPay, company.currency, payAmount);

    rowsByLabel.set(label, existing);

    const group = detailsByDate.get(e.dateKey) ?? {
      dateKey: e.dateKey,
      totalHours: 0,
      totalPay: {},
      items: [],
    };
    group.totalHours += hours;
    addMoney(group.totalPay, company.currency, payAmount);
    group.items.push({
      dateKey: e.dateKey,
      label: company.name,
      subject: e.name ?? "",
      startMinutes: e.startMinutes,
      endMinutes: e.endMinutes,
      hours: round2(hours),
      currency: company.currency,
      payAmount,
    });
    detailsByDate.set(e.dateKey, group);
  }

  const rows = [...rowsByLabel.values()]
    .map((r) => ({ ...r, hours: round2(r.hours) }))
    .sort((a, b) => b.hours - a.hours);

  const details: DetailGroup[] = [...detailsByDate.values()]
    .map((g) => ({
      ...g,
      totalHours: round2(g.totalHours),
      items: g.items.sort((a, b) => a.startMinutes - b.startMinutes),
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return { totalHours: round2(totalHours), totalPay, rows, details };
}

function MoneyValue({ totals }: { totals: MoneyTotals }) {
  const lines = moneyLines(totals);
  if (!lines.length) return <span>—</span>;
  if (lines.length === 1) return <span>{formatMoney(lines[0].amount, lines[0].currency)}</span>;
  return (
    <span className="flex flex-col">
      {lines.map((l) => (
        <span key={l.currency}>{formatMoney(l.amount, l.currency)}</span>
      ))}
    </span>
  );
}

export function HoursView() {
  const { uid } = useCurrentUser();
  const { companies, loading: companiesLoading } = useCompanies(uid);

  const [baseKey, setBaseKey] = useState("2000-01-01");
  const [detailMode, setDetailMode] = useState<"day" | "week" | "biweekly" | "month">("day");

  useEffect(() => {
    setBaseKey(dateKeyFromDate(new Date()));
  }, []);

  const baseParts = useMemo(() => parseDateKey(baseKey), [baseKey]);

  const ranges = useMemo(() => {
    const safe = baseParts ?? { year: 2000, month1Based: 1, day: 1 };
    const base = new Date(safe.year, safe.month1Based - 1, safe.day, 12, 0, 0);
    const weekStart = startOfWeekMonday(base);
    const weekEnd = addDays(weekStart, 6);
    const biweeklyStartDay = safe.day <= 15 ? 1 : 16;
    const biweeklyEndDay =
      safe.day <= 15 ? 15 : lastDayOfMonth(safe.year, safe.month1Based);
    const monthLast = lastDayOfMonth(safe.year, safe.month1Based);

    return {
      day: { startKey: dateKeyFromDate(base), endKey: dateKeyFromDate(base) },
      week: { startKey: dateKeyFromDate(weekStart), endKey: dateKeyFromDate(weekEnd) },
      biweekly: {
        startKey: dateKeyFromParts(safe.year, safe.month1Based, biweeklyStartDay),
        endKey: dateKeyFromParts(safe.year, safe.month1Based, biweeklyEndDay),
      },
      month: {
        startKey: dateKeyFromParts(safe.year, safe.month1Based, 1),
        endKey: dateKeyFromParts(safe.year, safe.month1Based, monthLast),
      },
    };
  }, [baseParts]);

  const day = useScheduleEntries(uid, ranges.day);
  const week = useScheduleEntries(uid, ranges.week);
  const biweekly = useScheduleEntries(uid, ranges.biweekly);
  const month = useScheduleEntries(uid, ranges.month);

  const loading =
    companiesLoading || day.loading || week.loading || biweekly.loading || month.loading;

  const hourlyCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (c.payType !== "hourly") return false;
      if (typeof c.hourlyRate !== "number") return false;
      if (!Number.isFinite(c.hourlyRate)) return false;
      return c.hourlyRate > 0;
    });
  }, [companies]);

  const dayPay = useMemo(
    () => computePaySummary(day.entries, hourlyCompanies),
    [day.entries, hourlyCompanies],
  );
  const weekPay = useMemo(
    () => computePaySummary(week.entries, hourlyCompanies),
    [hourlyCompanies, week.entries],
  );
  const biweeklyPay = useMemo(
    () => computePaySummary(biweekly.entries, hourlyCompanies),
    [biweekly.entries, hourlyCompanies],
  );
  const monthPay = useMemo(
    () => computePaySummary(month.entries, hourlyCompanies),
    [hourlyCompanies, month.entries],
  );

  const anyError = day.error ?? week.error ?? biweekly.error ?? month.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-blue)]">
            <Coins className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Pago calculado por horas
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              Basado en Horarios + valor hora de Empresas.
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
          <CalendarDays className="h-4 w-4 text-[color:var(--color-muted)]" />
          <input
            value={baseKey}
            onChange={(e) => setBaseKey(e.target.value)}
            type="date"
            className="h-8 bg-transparent text-sm font-semibold text-[color:var(--color-foreground)] outline-none"
          />
        </label>
      </div>

      {anyError ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
          {anyError}
        </div>
      ) : null}

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="text-xs font-semibold text-[color:var(--color-muted)]">
          Día: {ranges.day.startKey} · Semana: {ranges.week.startKey} → {ranges.week.endKey} · Quincena:{" "}
          {ranges.biweekly.startKey} → {ranges.biweekly.endKey} · Mes: {ranges.month.startKey} → {ranges.month.endKey}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Día", sub: ranges.day.startKey, data: dayPay },
          { title: "Semana", sub: `${ranges.week.startKey} → ${ranges.week.endKey}`, data: weekPay },
          { title: "Quincena", sub: `${ranges.biweekly.startKey} → ${ranges.biweekly.endKey}`, data: biweeklyPay },
          { title: "Mes", sub: `${ranges.month.startKey} → ${ranges.month.endKey}`, data: monthPay },
        ].map(({ title, sub, data }) => (
          <div
            key={title}
            className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm"
          >
            <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
              {title}
            </div>
            <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
              {sub}
            </div>
            <div className="mt-3 text-lg font-extrabold tracking-tight text-[color:var(--color-foreground)]">
              {loading ? "…" : <MoneyValue totals={data.totalPay} />}
            </div>
            <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
              {loading ? "…" : `${data.totalHours} H`}
            </div>

            <div className="mt-3 space-y-2">
              {!loading && data.rows.length ? (
                data.rows.slice(0, 4).map((r) => (
                  <div
                    key={r.label}
                    className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-extrabold text-[color:var(--color-foreground)]">
                        {r.label}
                      </div>
                      <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                        {r.hours} H
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                      <div className="text-[color:var(--color-muted)]">Pago</div>
                      <div className="font-extrabold text-[color:var(--color-foreground)]">
                        <MoneyValue totals={r.pay} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[color:var(--color-muted)]">
                  {loading ? "Cargando…" : "Sin empresas por hora / sin horarios"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
              Detalle de horas (solo pago por hora)
            </div>
            <div className="text-xs text-[color:var(--color-muted)]">
              Día, horario y materia/clase.
            </div>
          </div>
          <select
            value={detailMode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "week" || v === "biweekly" || v === "month") setDetailMode(v);
              else setDetailMode("day");
            }}
            className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
          >
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="biweekly">Quincena</option>
            <option value="month">Mes</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {(() => {
            const data =
              detailMode === "week"
                ? weekPay
                : detailMode === "biweekly"
                  ? biweeklyPay
                  : detailMode === "month"
                    ? monthPay
                    : dayPay;

            if (loading) {
              return (
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
                  Cargando…
                </div>
              );
            }

            if (!hourlyCompanies.length) {
              return (
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] p-4 text-sm text-[color:var(--color-foreground)]">
                  No hay empresas configuradas como “Por hora”.
                </div>
              );
            }

            if (!data.details.length) {
              return (
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
                  No hay horarios con empresas “Por hora” en este rango.
                </div>
              );
            }

            return data.details.map((g) => (
              <div
                key={g.dateKey}
                className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                      {g.dateKey}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
                      {g.totalHours} H · <MoneyValue totals={g.totalPay} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {g.items.map((it, idx) => (
                    <div
                      key={`${it.dateKey}-${it.label}-${it.startMinutes}-${idx}`}
                      className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-[color:var(--color-foreground)]">
                            {it.subject || "—"}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[color:var(--color-muted)]">
                            <span>{it.label}</span>
                            <span>
                              {minutesToTime(it.startMinutes)} - {minutesToTime(it.endMinutes)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                            {it.hours} H
                          </div>
                          <div className="text-xs font-extrabold text-[color:var(--color-foreground)]">
                            {formatMoney(it.payAmount, it.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] p-4 text-sm text-[color:var(--color-foreground)]">
        Esta sección solo considera empresas configuradas como “Por hora”. Las empresas de pago fijo (ej. mensual) no aparecen aquí.
      </div>
    </div>
  );
}
