"use client";

import {
  Banknote,
  CalendarDays,
  Clock,
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
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";
import { formatDate, formatMoney } from "@/shared/utils/format";

type Props = {
  uid: string;
};

export function PayslipsView({ uid }: Props) {
  const { companies, loading: companiesLoading } = useCompanies(uid);
  const { payslips, loading, error } = usePayslips(uid);

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
                const bg =
                  idx % 4 === 0
                    ? "bg-[color:var(--postit-yellow)]"
                    : idx % 4 === 1
                      ? "bg-[color:var(--postit-blue)]"
                      : idx % 4 === 2
                        ? "bg-[color:var(--postit-green)]"
                        : "bg-[color:var(--postit-purple)]";

                const Icon = c.payType === "hourly" ? Clock : Banknote;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCompanyId(c.id);
                      if (editing) setEditing(null);
                    }}
                    className={[
                      "flex items-center gap-2 rounded-3xl border border-[color:var(--color-border)] px-3 py-3 text-left transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      bg,
                      selected ? "ring-4 ring-[color:var(--primary-ring)]" : "",
                    ].join(" ")}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/75">
                      <Icon className="h-5 w-5 text-[color:var(--color-foreground)]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-[color:var(--color-muted)]">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-5 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {editing ? "Actualizar" : "Guardar"}
              </button>
            </div>

            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs text-[color:var(--color-muted)]">
              Periodo: {formatDate(period.start)} - {formatDate(period.end)}
            </div>
          </div>
        </div>
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {payslips.map((p, idx) => {
          const bg =
            idx % 4 === 0
              ? "bg-[color:var(--postit-blue)]"
              : idx % 4 === 1
                ? "bg-[color:var(--postit-yellow)]"
                : idx % 4 === 2
                  ? "bg-[color:var(--postit-green)]"
                  : "bg-[color:var(--postit-purple)]";

          return (
            <div
              key={p.id}
              className={[
                "rounded-3xl border border-[color:var(--color-border)] p-4 shadow-sm",
                bg,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
                    {p.companyName}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
                    {p.periodType === "biweekly"
                      ? `Q${p.periodStart.toDate().getDate() <= 15 ? "1" : "2"}`
                      : "MES"}{" "}
                    · {periodLabel(p)}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                    {formatMoney(p.amount, p.currency)}
                  </div>
                  {p.createdAt ? (
                    <div className="mt-2 text-xs text-[color:var(--color-muted)]">
                      REGISTRO: {formatDate(p.createdAt.toDate())}
                    </div>
                  ) : null}
                  {p.notes ? (
                    <div className="mt-2 max-h-10 overflow-hidden text-xs text-[color:var(--color-muted)]">
                      {p.notes}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
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
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 text-[color:var(--color-foreground)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    disabled={busyId === p.id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 text-[color:var(--color-foreground)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
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

    </div>
  );
}
