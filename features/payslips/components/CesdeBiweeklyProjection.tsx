"use client";

import { CalendarDays, Coins, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Company } from "@/features/companies/types";
import { useScheduleEntries } from "@/features/schedules/hooks/useScheduleEntries";
import { dateKeyFromParts } from "@/features/schedules/utils/dateKey";
import { minutesPerHourUnit } from "@/features/schedules/utils/time";
import type { Payslip } from "@/features/payslips/types";
import { buildPeriodKey } from "@/features/payslips/utils/periods";
import { formatDateKeyWithWeekday, formatMoney } from "@/shared/utils/format";
import { normalizeUpper } from "@/shared/utils/text";

function lastDayOfMonth(year: number, month1Based: number) {
  return new Date(year, month1Based, 0).getDate();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function findCesdeCompany(companies: Company[]) {
  return companies.find((c) => normalizeUpper(c.name) === "CESDE") ?? null;
}

function dayKey(year: number, month1Based: number, day: number) {
  return dateKeyFromParts(year, month1Based, day);
}

export function CesdeBiweeklyProjection({
  uid,
  companies,
  payslips,
}: {
  uid: string;
  companies: Company[];
  payslips: Payslip[];
}) {
  const [monthValue, setMonthValue] = useState("2000-01");
  const [part, setPart] = useState<1 | 2>(1);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setMonthValue(`${y}-${String(m).padStart(2, "0")}`);
    setPart(now.getDate() <= 15 ? 1 : 2);
  }, []);

  useEffect(() => setAnimate(true), []);

  const { year, month1Based } = useMemo(() => {
    const [y, m] = monthValue.split("-");
    const year = Number(y);
    const month1Based = Number(m);
    return {
      year: Number.isFinite(year) ? year : 2000,
      month1Based: Number.isFinite(month1Based) ? month1Based : 1,
    };
  }, [monthValue]);

  const range = useMemo(() => {
    const startDay = part === 1 ? 1 : 16;
    const endDay = part === 1 ? 15 : lastDayOfMonth(year, month1Based);
    return {
      startKey: dayKey(year, month1Based, startDay),
      endKey: dayKey(year, month1Based, endDay),
      startDay,
      endDay,
    };
  }, [month1Based, part, year]);

  const cesdeCompany = useMemo(() => findCesdeCompany(companies), [companies]);

  const cesdeRate = useMemo(() => {
    if (!cesdeCompany) return null;
    if (cesdeCompany.payType !== "hourly") return null;
    if (typeof cesdeCompany.hourlyRate !== "number") return null;
    if (!Number.isFinite(cesdeCompany.hourlyRate) || cesdeCompany.hourlyRate <= 0) return null;
    return { value: cesdeCompany.hourlyRate, currency: cesdeCompany.currency };
  }, [cesdeCompany]);

  const schedules = useScheduleEntries(uid, { startKey: range.startKey, endKey: range.endKey });

  const cesdeEntries = useMemo(() => {
    return schedules.entries.filter((e) => e.institutionKind === "CESDE");
  }, [schedules.entries]);

  const byDay = useMemo(() => {
    const map = new Map<string, { hours: number; count: number }>();
    for (const e of cesdeEntries) {
      const minutes = Math.max(0, e.endMinutes - e.startMinutes);
      const hours = minutes / minutesPerHourUnit("CESDE");
      const prev = map.get(e.dateKey) ?? { hours: 0, count: 0 };
      prev.hours += hours;
      prev.count += 1;
      map.set(e.dateKey, prev);
    }
    return [...map.entries()]
      .map(([dateKey, v]) => ({ dateKey, hours: round2(v.hours), count: v.count }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [cesdeEntries]);

  const totalHours = useMemo(() => {
    return round2(byDay.reduce((acc, d) => acc + d.hours, 0));
  }, [byDay]);

  const projectedPay = useMemo(() => {
    if (!cesdeRate) return null;
    return totalHours * cesdeRate.value;
  }, [cesdeRate, totalHours]);

  const periodKey = useMemo(
    () => buildPeriodKey("biweekly", year, month1Based, part),
    [month1Based, part, year],
  );

  const actualPayslip = useMemo(() => {
    if (!cesdeCompany) return null;
    return (
      payslips.find((p) => p.companyId === cesdeCompany.id && p.periodKey === periodKey) ?? null
    );
  }, [cesdeCompany, payslips, periodKey]);

  const actualPay = useMemo(() => (actualPayslip ? Number(actualPayslip.amount || 0) : null), [actualPayslip]);

  const diff = useMemo(() => {
    if (projectedPay == null || actualPay == null) return null;
    return actualPay - projectedPay;
  }, [actualPay, projectedPay]);

  const comparePct = useMemo(() => {
    if (projectedPay == null || projectedPay <= 0 || actualPay == null) return 0;
    return clamp01(actualPay / projectedPay);
  }, [actualPay, projectedPay]);

  const diffTone = diff == null ? "muted" : diff >= 0 ? "good" : "bad";
  const diffBg =
    diffTone === "good"
      ? "bg-[color:var(--postit-green)]"
      : diffTone === "bad"
        ? "bg-[color:var(--postit-pink)]"
        : "bg-[color:var(--color-surface-2)]";

  return (
    <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-blue)]">
            <Coins className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
              Proyección CESDE (quincena)
            </div>
            <div className="text-xs text-[color:var(--color-muted)]">
              Compara colilla registrada vs lo que indican tus horarios.
            </div>
          </div>
        </div>
      </div>

      {!cesdeCompany ? (
        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] p-4 text-sm text-[color:var(--color-foreground)]">
          No encontré una empresa llamada CESDE. Crea una empresa con nombre “CESDE”.
        </div>
      ) : null}

      {cesdeCompany && !cesdeRate ? (
        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] p-4 text-sm text-[color:var(--color-foreground)]">
          CESDE debe estar configurado como “Por hora” con valor hora para proyectar.
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_1fr] sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[color:var(--color-muted)]">Mes</span>
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-label="Quincena 1"
            aria-pressed={part === 1}
            onClick={() => setPart(1)}
            className={[
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
              part === 1
                ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] ring-4 ring-[color:var(--primary-ring)]"
                : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
            ].join(" ")}
          >
            <span className="grid h-8 w-8 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-xs font-extrabold text-[color:var(--color-foreground)]">
              1
            </span>
          </button>
          <button
            type="button"
            aria-label="Quincena 2"
            aria-pressed={part === 2}
            onClick={() => setPart(2)}
            className={[
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
              part === 2
                ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] ring-4 ring-[color:var(--primary-ring)]"
                : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
            ].join(" ")}
          >
            <span className="grid h-8 w-8 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-xs font-extrabold text-[color:var(--color-foreground)]">
              2
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--color-muted)]">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatDateKeyWithWeekday(range.startKey)} → {formatDateKeyWithWeekday(range.endKey)}
          </span>
        </div>
      </div>

      {schedules.error ? (
        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
          {schedules.error}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
            Horas (CESDE)
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {schedules.loading ? "…" : `${totalHours} H`}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            {byDay.length} días con clases
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
            Proyección
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {schedules.loading || projectedPay == null || !cesdeRate
              ? "—"
              : formatMoney(projectedPay, cesdeRate.currency)}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            {cesdeRate ? `${formatMoney(cesdeRate.value, cesdeRate.currency)} / H` : "—"}
          </div>
        </div>

        <div className={["rounded-3xl border border-[color:var(--color-border)] p-4", diffBg].join(" ")}>
          <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
            Comparación
          </div>
          <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
            {actualPay == null ? "Sin colilla registrada" : "Colilla registrada"}
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {actualPay == null || !cesdeCompany ? "—" : formatMoney(actualPay, cesdeCompany.currency)}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            {diff == null
              ? `Periodo: ${periodKey}`
              : diff >= 0
                ? `+${formatMoney(diff, cesdeCompany!.currency)}`
                : `-${formatMoney(Math.abs(diff), cesdeCompany!.currency)}`}
          </div>
        </div>
      </div>

      {projectedPay != null && actualPay != null ? (
        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[color:var(--color-muted)]">
            <span>Pagado vs proyección</span>
            <span>{Math.round(comparePct * 100)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
            <div
              className="h-full rounded-full"
              style={{
                width: animate ? `${comparePct * 100}%` : "0%",
                backgroundColor: "var(--primary)",
                transition: "width 800ms ease-out",
              }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--color-muted)]">
                  <Minus className="h-4 w-4" />
                  Proyección
                </div>
                <div className="text-xs font-extrabold text-[color:var(--color-foreground)]">
                  {formatMoney(projectedPay, cesdeCompany!.currency)}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--color-muted)]">
                  <Plus className="h-4 w-4" />
                  Pagado
                </div>
                <div className="text-xs font-extrabold text-[color:var(--color-foreground)]">
                  {formatMoney(actualPay, cesdeCompany!.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {byDay.length ? (
        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
            Detalle por día (CESDE)
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byDay.map((d) => (
              <div
                key={d.dateKey}
                className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[color:var(--color-muted)]">
                    {d.dateKey}
                  </div>
                  <div className="text-xs font-extrabold text-[color:var(--color-foreground)]">
                    {d.count}
                  </div>
                </div>
                <div className="mt-1 text-sm font-extrabold text-[color:var(--color-foreground)]">
                  {d.hours} H
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
          {schedules.loading ? "Cargando…" : "No hay horarios CESDE en este rango."}
        </div>
      )}
    </div>
  );
}
