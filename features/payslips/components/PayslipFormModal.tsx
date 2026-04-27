"use client";

import { Banknote, Save, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { Company } from "@/features/companies/types";
import type { BiweeklyPart, Payslip, PayslipInput, PayPeriodType } from "@/features/payslips/types";
import { buildPeriodKey, getBiweeklyRange, getMonthlyRange } from "@/features/payslips/utils/periods";
import { parseISODateInput, timestampToISODateInput } from "@/shared/utils/date";
import { formatDateWithWeekday } from "@/shared/utils/format";
import { normalizeUpper } from "@/shared/utils/text";

type Props = {
  open: boolean;
  title: string;
  companies: Company[];
  initial?: Payslip | null;
  onClose: () => void;
  onSubmit: (input: PayslipInput) => Promise<void>;
};

function nowParts() {
  const now = new Date();
  return { year: now.getFullYear(), month1Based: now.getMonth() + 1 };
}

export function PayslipFormModal({
  open,
  title,
  companies,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [companyId, setCompanyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [periodType, setPeriodType] = useState<PayPeriodType>("biweekly");
  const [year, setYear] = useState<number>(2000);
  const [month1Based, setMonth1Based] = useState<number>(1);
  const [biweeklyPart, setBiweeklyPart] = useState<BiweeklyPart>(1);
  const [payDate, setPayDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const company = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
    [companies, companyId],
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCompanyId(initial.companyId);
      setAmount(String(initial.amount));
      setPeriodType(initial.periodType);
      setPayDate(initial.payDate ? timestampToISODateInput(initial.payDate) : "");
      setNotes(initial.notes ?? "");

      const start = initial.periodStart.toDate();
      setYear(start.getFullYear());
      setMonth1Based(start.getMonth() + 1);
      setBiweeklyPart(start.getDate() <= 15 ? 1 : 2);
    } else {
      setCompanyId(companies[0]?.id ?? "");
      setAmount("");
      setPeriodType("biweekly");
      const parts = nowParts();
      setYear(parts.year);
      setMonth1Based(parts.month1Based);
      setBiweeklyPart(new Date().getDate() <= 15 ? 1 : 2);
      setPayDate("");
      setNotes("");
    }
    setLoading(false);
  }, [open, initial, companies]);

  useEffect(() => {
    if (!open) return;
    if (initial) return;
    if (!company) return;
    setPeriodType(company.payFrequency === "monthly" ? "monthly" : "biweekly");
  }, [company, initial, open]);

  const period = useMemo(() => {
    if (periodType === "monthly") return getMonthlyRange(year, month1Based);
    return getBiweeklyRange(year, month1Based, biweeklyPart);
  }, [periodType, year, month1Based, biweeklyPart]);

  const canSubmit = useMemo(() => {
    if (!companyId) return false;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [companyId, amount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !company) return;
    setLoading(true);
    try {
      const input: PayslipInput = {
        companyId: company.id,
        companyName: company.name,
        payType: company.payType,
        payFrequency: company.payFrequency,
        currency: company.currency,
        amount: Number(amount),
        periodType,
        periodKey: buildPeriodKey(
          periodType,
          year,
          month1Based,
          periodType === "biweekly" ? biweeklyPart : undefined,
        ),
        periodStart: period.start,
        periodEnd: period.end,
        payDate: payDate ? parseISODateInput(payDate) : undefined,
        notes: notes ? normalizeUpper(notes) : undefined,
      };

      await onSubmit(input);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="absolute inset-0 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md animate-[fade-in-up_220ms_ease-out] rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-green)]">
                <Banknote className="h-5 w-5 text-[color:var(--color-foreground)]" />
              </span>
              <div>
                <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  {title}
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  Registra el pago real (colilla) por periodo.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-foreground)]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Empresa
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Tipo de periodo
                </label>
                <select
                  value={periodType}
                  onChange={(e) =>
                    setPeriodType(e.target.value === "monthly" ? "monthly" : "biweekly")
                  }
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                >
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Mes
                </label>
                <input
                  value={`${year}-${String(month1Based).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-");
                    const yy = Number(y);
                    const mm = Number(m);
                    if (Number.isFinite(yy)) setYear(yy);
                    if (Number.isFinite(mm)) setMonth1Based(mm);
                  }}
                  type="month"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
            </div>

            {periodType === "biweekly" ? (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Quincena
                </label>
                <select
                  value={String(biweeklyPart)}
                  onChange={(e) => setBiweeklyPart(e.target.value === "2" ? 2 : 1)}
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                >
                  <option value="1">1 - 15</option>
                  <option value="2">16 - fin de mes</option>
                </select>
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Monto ({company?.currency ?? "COP"})
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Ej. 2500000"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Fecha de pago (opcional)
              </label>
              <input
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                type="date"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(normalizeUpper(e.target.value))}
                rows={3}
                placeholder="EJ. PAGO COMPLETO"
                className="w-full resize-none rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>

            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs text-[color:var(--color-muted)]">
              Periodo: {formatDateWithWeekday(period.start)} - {formatDateWithWeekday(period.end)}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label="Cancelar"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)] disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                aria-label="Guardar"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
