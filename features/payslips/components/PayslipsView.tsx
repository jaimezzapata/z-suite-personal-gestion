"use client";

import {
  Banknote,
  CalendarDays,
  Clock,
  FileText,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCompanies } from "@/features/companies/hooks/useCompanies";
import type { Company } from "@/features/companies/types";
import { usePayslips } from "@/features/payslips/hooks/usePayslips";
import type { BiweeklyPart, Payslip, PayslipInput } from "@/features/payslips/types";
import {
  createPayslip,
  deletePayslip,
  updatePayslip,
} from "@/features/payslips/services/payslipsService";
import { buildPeriodKey, getBiweeklyRange, getMonthlyRange } from "@/features/payslips/utils/periods";
import { periodLabel, periodTypeLabel } from "@/features/payslips/utils/labels";
import { CesdeBiweeklyProjection } from "@/features/payslips/components/CesdeBiweeklyProjection";
import { CesdePayslipModal } from "@/features/payslips/components/CesdePayslipModal";
import { computeColombiaPayrollDeductions } from "@/features/payslips/utils/colombiaPayroll";
import { useScheduleEntries } from "@/features/schedules/hooks/useScheduleEntries";
import { minutesPerHourUnit } from "@/features/schedules/utils/time";
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";
import { isDarkHex, isValidHex, normalizeHex } from "@/shared/utils/color";
import { formatDateWithWeekday, formatMoney } from "@/shared/utils/format";
import { normalizeUpper } from "@/shared/utils/text";

type Props = {
  uid: string;
};

function isCesdeCompany(name: string | null | undefined) {
  const n = (name ?? "").trim().toUpperCase();
  return n === "CESDE" || n.startsWith("CESDE ");
}

function companyForScheduleLabel(companies: Company[], label: string) {
  const key = normalizeUpper(label);
  return companies.find((c) => normalizeUpper(c.name) === key) ?? null;
}

function periodKeyFromDateKey(payFrequency: Company["payFrequency"], dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  const year = Number(y);
  const month1Based = Number(m);
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month1Based) || !Number.isFinite(day)) return null;
  if (payFrequency === "monthly") {
    return buildPeriodKey("monthly", year, month1Based);
  }
  return buildPeriodKey("biweekly", year, month1Based, day <= 15 ? 1 : 2);
}

function addCurrencyTotal(
  totals: Partial<Record<Company["currency"], number>>,
  currency: Company["currency"],
  amount: number,
) {
  totals[currency] = (totals[currency] ?? 0) + amount;
}

function diffLabel(diffAmount: number) {
  if (diffAmount > 0) return "Pagaron de mas";
  if (diffAmount < 0) return "Pagaron de menos";
  return "Pago exacto";
}

export function PayslipsView({ uid }: Props) {
  const { companies, loading: companiesLoading } = useCompanies(uid);
  const { payslips, loading, error } = usePayslips(uid);

  const [cesdeSlip, setCesdeSlip] = useState<Payslip | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [biweeklyPart, setBiweeklyPart] = useState<BiweeklyPart>(1);
  const [editing, setEditing] = useState<Payslip | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  const emptyCompanies = useMemo(
    () => !companiesLoading && companies.length === 0,
    [companiesLoading, companies.length],
  );

  const emptyPayslips = useMemo(
    () => !loading && payslips.length === 0,
    [loading, payslips.length],
  );

  const companiesForPick = useMemo<Company[]>(() => {
    return [...companies].sort((a, b) => {
      const byActive = Number(b.active) - Number(a.active);
      if (byActive !== 0) return byActive;
      return a.name.localeCompare(b.name);
    });
  }, [companies]);

  const selectedCompany = useMemo(
    () => companiesForPick.find((c) => c.id === selectedCompanyId) ?? null,
    [companiesForPick, selectedCompanyId],
  );

  useEffect(() => {
    if (!selectedCompanyId && companiesForPick.length) {
      setSelectedCompanyId(companiesForPick[0].id);
    }
  }, [companiesForPick, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompany) return;
    if (editing) return;
    if (selectedCompany.payFrequency !== "biweekly") return;
    if (!today) return;
    setBiweeklyPart(today.getDate() <= 15 ? 1 : 2);
  }, [selectedCompany, editing, today]);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const baseDate = useMemo(() => {
    if (editing) return editing.periodStart.toDate();
    return today ?? new Date(2000, 0, 1);
  }, [editing, today]);

  const year = baseDate.getFullYear();
  const month1Based = baseDate.getMonth() + 1;

  const derivedPeriodType = selectedCompany?.payFrequency ?? "biweekly";

  const period = useMemo(() => {
    if (derivedPeriodType === "monthly") return getMonthlyRange(year, month1Based);
    return getBiweeklyRange(year, month1Based, biweeklyPart);
  }, [derivedPeriodType, year, month1Based, biweeklyPart]);

  const canSave = useMemo(() => {
    if (!selectedCompany) return false;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [selectedCompany, amount]);

  const selectedGross = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [amount]);

  const selectedDeductions = useMemo(() => {
    if (!selectedCompany) return null;
    if (!isCesdeCompany(selectedCompany.name)) return null;
    if (selectedGross == null) return null;
    return computeColombiaPayrollDeductions(selectedGross);
  }, [selectedCompany, selectedGross]);

  const payslipScheduleRange = useMemo(() => {
    if (!payslips.length) {
      const start = period.start;
      const end = period.end;
      return {
        startKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
        endKey: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
      };
    }

    let minStart = payslips[0].periodStart.toDate();
    let maxEnd = payslips[0].periodEnd.toDate();
    for (const item of payslips) {
      const start = item.periodStart.toDate();
      const end = item.periodEnd.toDate();
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    }

    return {
      startKey: `${minStart.getFullYear()}-${String(minStart.getMonth() + 1).padStart(2, "0")}-${String(minStart.getDate()).padStart(2, "0")}`,
      endKey: `${maxEnd.getFullYear()}-${String(maxEnd.getMonth() + 1).padStart(2, "0")}-${String(maxEnd.getDate()).padStart(2, "0")}`,
    };
  }, [payslips, period.end, period.start]);

  const payslipSchedules = useScheduleEntries(uid, payslipScheduleRange);

  const projectedByPayslipId = useMemo(() => {
    const hourlyCompanies = companies.filter(
      (company) =>
        company.payType === "hourly" &&
        typeof company.hourlyRate === "number" &&
        Number.isFinite(company.hourlyRate) &&
        company.hourlyRate > 0,
    );

    const hourlyProjectedByBucket = new Map<string, number>();
    for (const entry of payslipSchedules.entries) {
      const label =
        entry.institutionKind === "OTRA"
          ? entry.institutionName?.trim()
            ? normalizeUpper(entry.institutionName.trim())
            : "OTRA"
          : entry.institutionKind;
      const company = companyForScheduleLabel(hourlyCompanies, label);
      if (!company || typeof company.hourlyRate !== "number") continue;

      const bucketPeriodKey = periodKeyFromDateKey(company.payFrequency, entry.dateKey);
      if (!bucketPeriodKey) continue;

      const minutes = Math.max(0, entry.endMinutes - entry.startMinutes);
      const projectedAmount = (minutes / minutesPerHourUnit(entry.institutionKind)) * company.hourlyRate;
      const bucketKey = `${company.id}::${bucketPeriodKey}`;
      hourlyProjectedByBucket.set(bucketKey, (hourlyProjectedByBucket.get(bucketKey) ?? 0) + projectedAmount);
    }

    const out = new Map<string, number | null>();
    for (const payslip of payslips) {
      const company = companies.find((item) => item.id === payslip.companyId) ?? null;
      if (!company) {
        out.set(payslip.id, null);
        continue;
      }

      if (company.payType === "fixed") {
        const projected =
          typeof company.fixedSalary === "number" &&
          Number.isFinite(company.fixedSalary) &&
          company.fixedSalary > 0
            ? company.fixedSalary
            : null;
        out.set(payslip.id, projected);
        continue;
      }

      const projected = hourlyProjectedByBucket.get(`${company.id}::${payslip.periodKey}`) ?? null;
      out.set(payslip.id, projected);
    }

    return out;
  }, [companies, payslipSchedules.entries, payslips]);

  const comparisonSummary = useMemo(() => {
    const actual: Partial<Record<Company["currency"], number>> = {};
    const projected: Partial<Record<Company["currency"], number>> = {};
    const diff: Partial<Record<Company["currency"], number>> = {};
    let comparedCount = 0;

    for (const payslip of payslips) {
      const projectedAmount = projectedByPayslipId.get(payslip.id) ?? null;
      if (projectedAmount == null) continue;
      comparedCount += 1;
      addCurrencyTotal(actual, payslip.currency, payslip.amount);
      addCurrencyTotal(projected, payslip.currency, projectedAmount);
      addCurrencyTotal(diff, payslip.currency, payslip.amount - projectedAmount);
    }

    const currencies = Array.from(
      new Set([
        ...(Object.keys(actual) as Company["currency"][]),
        ...(Object.keys(projected) as Company["currency"][]),
        ...(Object.keys(diff) as Company["currency"][]),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    return {
      comparedCount,
      currencies,
      actual,
      projected,
      diff,
    };
  }, [payslips, projectedByPayslipId]);

  async function handleCreate(input: PayslipInput) {
    try {
      await createPayslip(uid, input);
      toast.success({ title: "Listo", message: "Colilla creada" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo crear la colilla",
      });
      throw e;
    }
  }

  async function handleUpdate(input: PayslipInput) {
    if (!editing) return;
    try {
      await updatePayslip(uid, editing.id, input);
      toast.success({ title: "Listo", message: "Colilla actualizada" });
    } catch (e) {
      toast.error({
        title: "Error",
        message:
          e instanceof Error ? e.message : "No se pudo actualizar la colilla",
      });
      throw e;
    }
  }

  async function handleSave() {
    if (!selectedCompany) return;
    if (!canSave) return;
    if (saving) return;

    setSaving(true);
    const input: PayslipInput = {
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
      payType: selectedCompany.payType,
      payFrequency: selectedCompany.payFrequency,
      currency: selectedCompany.currency,
      amount: Number(amount),
      periodType: derivedPeriodType,
      periodKey: buildPeriodKey(
        derivedPeriodType,
        year,
        month1Based,
        derivedPeriodType === "biweekly" ? biweeklyPart : undefined,
      ),
      periodStart: period.start,
      periodEnd: period.end,
    };

    try {
      if (editing) {
        await handleUpdate(input);
      } else {
        await handleCreate(input);
      }

      setAmount("");
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Payslip) {
    if (busyId) return;
    const ok = await confirm({
      title: "Eliminar colilla",
      message: `¿Eliminar la colilla de "${p.companyName}" (${periodTypeLabel(p.periodType)})?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(p.id);
    try {
      await deletePayslip(uid, p.id);
      toast.success({ title: "Listo", message: "Colilla eliminada" });
    } catch (e) {
      toast.error({
        title: "Error",
        message:
          e instanceof Error ? e.message : "No se pudo eliminar la colilla",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-green)]">
            <Banknote className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Colillas / Pagos
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              Registra lo pagado (monto real) por periodo.
            </div>
          </div>
        </div>

        <div className="text-sm text-[color:var(--color-muted)]">
          {editing ? "Editando colilla" : "Registro rápido"}
        </div>
      </div>

      {emptyCompanies ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] p-4 text-sm text-[color:var(--color-foreground)]">
          Primero crea al menos una empresa en{" "}
          <Link href="/empresas" className="font-semibold underline">
            Empresas
          </Link>
          .
        </div>
      ) : null}

      {!emptyCompanies ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {companiesForPick.map((c, idx) => {
                const selected = c.id === selectedCompanyId;
                const hex = c.colorHex?.trim() ? normalizeHex(c.colorHex) : "";
                const hasHex = Boolean(hex && isValidHex(hex));
                const style = hasHex ? ({ backgroundColor: hex } as const) : undefined;
                const bg =
                  c.colorKey === "postit-yellow"
                    ? "bg-[color:var(--postit-yellow)]"
                    : c.colorKey === "postit-blue"
                      ? "bg-[color:var(--postit-blue)]"
                      : c.colorKey === "postit-green"
                        ? "bg-[color:var(--postit-green)]"
                        : c.colorKey === "postit-purple"
                          ? "bg-[color:var(--postit-purple)]"
                          : c.colorKey === "postit-pink"
                            ? "bg-[color:var(--postit-pink)]"
                            : idx % 4 === 0
                              ? "bg-[color:var(--postit-yellow)]"
                              : idx % 4 === 1
                                ? "bg-[color:var(--postit-blue)]"
                                : idx % 4 === 2
                                  ? "bg-[color:var(--postit-green)]"
                                  : "bg-[color:var(--postit-purple)]";

                const Icon = c.payType === "hourly" ? Clock : Banknote;

                const titleClass = "text-white";
                const mutedClass = "text-white/85";
                const iconWrapClass = "border-white/35 bg-white/90";
                const borderClass = "border-white/25";

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCompanyId(c.id);
                      if (editing) setEditing(null);
                    }}
                    style={style}
                    className={[
                      "flex items-center gap-2 rounded-3xl border px-3 py-3 text-left transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      bg,
                      borderClass,
                      selected ? "ring-4 ring-[color:var(--primary-ring)]" : "",
                    ].join(" ")}
                  >
                    <span className={["grid h-10 w-10 place-items-center rounded-2xl border", iconWrapClass].join(" ")}>
                      <Icon className="h-5 w-5 text-[color:var(--color-foreground)]" />
                    </span>
                    <span className="min-w-0">
                      <span className={["block truncate text-sm font-semibold", titleClass].join(" ")}>
                        {c.name}
                      </span>
                      <span className={["block truncate text-xs", mutedClass].join(" ")}>
                        {c.payFrequency === "monthly" ? "MENSUAL" : "QUINCENAL"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedCompany?.payFrequency === "biweekly" ? (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  Quincena
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBiweeklyPart(1)}
                    className={[
                      "flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      biweeklyPart === 1 ? "ring-4 ring-[color:var(--primary-ring)]" : "",
                    ].join(" ")}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Q1 (1-15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiweeklyPart(2)}
                    className={[
                      "flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      biweeklyPart === 2 ? "ring-4 ring-[color:var(--primary-ring)]" : "",
                    ].join(" ")}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Q2 (16-fin)
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Valor colilla ({selectedCompany?.currency ?? "COP"})
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 2500000"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave || !!busyId || saving}
                aria-label={editing ? "Actualizar colilla" : "Guardar colilla"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs text-[color:var(--color-muted)]">
              Periodo: {formatDateWithWeekday(period.start)} - {formatDateWithWeekday(period.end)}
            </div>

            {selectedCompany && selectedDeductions ? (
              <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                  Colilla (CESDE) · Deducciones ley
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                      Devengado
                    </div>
                    <div className="mt-0.5 text-sm font-extrabold text-[color:var(--color-foreground)]">
                      {formatMoney(selectedDeductions.base, selectedCompany.currency)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                      Deducciones
                    </div>
                    <div className="mt-0.5 text-sm font-extrabold text-[color:var(--color-foreground)]">
                      {formatMoney(selectedDeductions.total, selectedCompany.currency)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-green)] px-3 py-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                      Neto
                    </div>
                    <div className="mt-0.5 text-sm font-extrabold text-[color:var(--color-foreground)]">
                      {formatMoney(selectedDeductions.net, selectedCompany.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-xs font-semibold">
                    <div className="text-[color:var(--color-muted)]">Salud (4%)</div>
                    <div className="text-[color:var(--color-foreground)]">
                      {formatMoney(selectedDeductions.health, selectedCompany.currency)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-xs font-semibold">
                    <div className="text-[color:var(--color-muted)]">Pensión (4%)</div>
                    <div className="text-[color:var(--color-foreground)]">
                      {formatMoney(selectedDeductions.pension, selectedCompany.currency)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!emptyCompanies ? (
        <CesdeBiweeklyProjection uid={uid} companies={companies} payslips={payslips} />
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
          {error}
        </div>
      ) : null}

      {emptyPayslips ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Aún no tienes colillas registradas
          </div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Registra una colilla para empezar a comparar y ver tu dashboard.
          </div>
        </div>
      ) : null}

      {comparisonSummary.comparedCount > 0 ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                Resumen de comparacion
              </div>
              <div className="mt-1 text-xs text-[color:var(--color-muted)]">
                {comparisonSummary.comparedCount} colillas con proyeccion disponible.
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {comparisonSummary.currencies.map((currency) => {
              const actual = comparisonSummary.actual[currency] ?? 0;
              const projected = comparisonSummary.projected[currency] ?? 0;
              const diff = comparisonSummary.diff[currency] ?? 0;
              const toneClass =
                diff > 0
                  ? "bg-[color:var(--postit-green)]"
                  : diff < 0
                    ? "bg-[color:var(--postit-pink)]"
                    : "bg-[color:var(--color-surface-2)]";

              return (
                <div
                  key={currency}
                  className={["rounded-3xl border border-[color:var(--color-border)] p-4", toneClass].join(" ")}
                >
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                    {currency}
                  </div>
                  <div className="mt-3 space-y-2 text-xs font-semibold">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[color:var(--color-muted)]">Total real</span>
                      <span className="text-[color:var(--color-foreground)]">
                        {formatMoney(actual, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[color:var(--color-muted)]">Total proyectado</span>
                      <span className="text-[color:var(--color-foreground)]">
                        {formatMoney(projected, currency)}
                      </span>
                    </div>
                    <div className="border-t border-[color:var(--color-border)] pt-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[color:var(--color-muted)]">{diffLabel(diff)}</span>
                        <span className="font-extrabold text-[color:var(--color-foreground)]">
                          {diff > 0
                            ? `+${formatMoney(diff, currency)}`
                            : diff < 0
                              ? `-${formatMoney(Math.abs(diff), currency)}`
                              : formatMoney(0, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {payslips.map((p, idx) => {
          const companyForPayslip = companies.find((c) => c.id === p.companyId);
          const projectedAmount = projectedByPayslipId.get(p.id) ?? null;
          const deltaAmount = projectedAmount == null ? null : p.amount - projectedAmount;
          const hex = companyForPayslip?.colorHex?.trim()
            ? normalizeHex(companyForPayslip.colorHex)
            : "";
          const hasHex = Boolean(hex && isValidHex(hex));
          const dark = hasHex ? isDarkHex(hex) : false;
          const style = hasHex ? ({ backgroundColor: hex } as const) : undefined;
          const bg =
            companyForPayslip?.colorKey === "postit-yellow"
              ? "bg-[color:var(--postit-yellow)]"
              : companyForPayslip?.colorKey === "postit-blue"
                ? "bg-[color:var(--postit-blue)]"
                : companyForPayslip?.colorKey === "postit-green"
                  ? "bg-[color:var(--postit-green)]"
                  : companyForPayslip?.colorKey === "postit-purple"
                    ? "bg-[color:var(--postit-purple)]"
                    : companyForPayslip?.colorKey === "postit-pink"
                      ? "bg-[color:var(--postit-pink)]"
                      : idx % 4 === 0
                        ? "bg-[color:var(--postit-blue)]"
                        : idx % 4 === 1
                          ? "bg-[color:var(--postit-yellow)]"
                          : idx % 4 === 2
                            ? "bg-[color:var(--postit-green)]"
                            : "bg-[color:var(--postit-purple)]";

          const titleClass = dark ? "text-white" : "text-[color:var(--color-foreground)]";
          const mutedClass = dark ? "text-white/80" : "text-[color:var(--color-muted)]";
          const iconButtonClass = dark
            ? "border-white/40 bg-white/90 text-[color:var(--color-foreground)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)]";
          const deltaToneClass =
            deltaAmount == null
              ? ""
              : deltaAmount > 0
                ? dark
                  ? "text-white"
                  : "text-emerald-700"
                : deltaAmount < 0
                  ? dark
                    ? "text-white"
                    : "text-rose-700"
                  : dark
                    ? "text-white"
                    : "text-slate-700";

          return (
            <div
              key={p.id}
              style={style}
              className={[
                "rounded-3xl border border-[color:var(--color-border)] p-4 shadow-sm",
                bg,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={["truncate text-base font-semibold", titleClass].join(" ")}>
                    {p.companyName}
                  </div>
                  <div className={["mt-1 text-xs font-semibold", mutedClass].join(" ")}>
                    {p.periodType === "biweekly"
                      ? `Q${p.periodStart.toDate().getDate() <= 15 ? "1" : "2"}`
                      : "MES"}{" "}
                    · {periodLabel(p)}
                  </div>
                  <div className={["mt-2 text-sm font-semibold", titleClass].join(" ")}>
                    {formatMoney(p.amount, p.currency)}
                  </div>

                  {projectedAmount != null ? (
                    <div className={["mt-2 rounded-2xl border px-3 py-2 text-xs font-semibold", dark ? "border-white/25 bg-white/10 text-white/90" : "border-[color:var(--color-border)] bg-white/60 text-[color:var(--color-foreground)]"].join(" ")}>
                      <div>
                        Proyectado: <span className="font-extrabold">{formatMoney(projectedAmount, p.currency)}</span>
                      </div>
                      <div className={deltaToneClass}>
                        {deltaAmount == null ? "Diferencia" : diffLabel(deltaAmount)}:{" "}
                        <span className="font-extrabold">
                          {deltaAmount == null
                            ? "—"
                            : deltaAmount > 0
                              ? `+${formatMoney(deltaAmount, p.currency)}`
                              : deltaAmount < 0
                                ? `-${formatMoney(Math.abs(deltaAmount), p.currency)}`
                                : formatMoney(0, p.currency)}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {isCesdeCompany(p.companyName) ? (
                    <div className={["mt-2 text-xs font-semibold", mutedClass].join(" ")}>
                      {(() => {
                        const d = computeColombiaPayrollDeductions(p.amount);
                        return (
                          <>
                            DEDUCCIONES: {formatMoney(d.total, p.currency)} · NETO:{" "}
                            <span className={titleClass}>{formatMoney(d.net, p.currency)}</span>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {p.createdAt ? (
                    <div className={["mt-2 text-xs", mutedClass].join(" ")}>
                      REGISTRO: {formatDateWithWeekday(p.createdAt.toDate())}
                    </div>
                  ) : null}
                  {p.notes ? (
                    <div className={["mt-2 max-h-10 overflow-hidden text-xs", mutedClass].join(" ")}>
                      {p.notes}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-center gap-2">
                  {isCesdeCompany(p.companyName) ? (
                    <button
                      type="button"
                      onClick={() => setCesdeSlip(p)}
                      className={[
                        "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                        iconButtonClass,
                      ].join(" ")}
                      aria-label="Ver colilla"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(p);
                      setSelectedCompanyId(p.companyId);
                      setAmount(String(p.amount));
                      setBiweeklyPart(
                        p.periodStart.toDate().getDate() <= 15 ? 1 : 2,
                      );
                    }}
                    className={[
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      iconButtonClass,
                    ].join(" ")}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    disabled={busyId === p.id}
                    className={[
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60",
                      iconButtonClass,
                    ].join(" ")}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CesdePayslipModal uid={uid} open={cesdeSlip !== null} payslip={cesdeSlip} onClose={() => setCesdeSlip(null)} />
    </div>
  );
}
