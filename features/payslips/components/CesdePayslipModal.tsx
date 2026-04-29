"use client";

import { X } from "lucide-react";

import type { Payslip } from "@/features/payslips/types";
import { computeColombiaPayrollDeductions } from "@/features/payslips/utils/colombiaPayroll";
import { periodLabel, periodTypeLabel } from "@/features/payslips/utils/labels";
import { formatDateWithWeekday, formatMoney } from "@/shared/utils/format";

type Props = {
  open: boolean;
  payslip: Payslip | null;
  onClose: () => void;
};

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div
        className={[
          "min-w-0 text-xs font-extrabold uppercase tracking-wide",
          muted ? "text-[color:var(--color-muted)]" : "text-[color:var(--color-foreground)]",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="whitespace-nowrap text-right text-xs font-extrabold tabular-nums text-[color:var(--color-foreground)]">
        {value}
      </div>
    </div>
  );
}

export function CesdePayslipModal({ open, payslip, onClose }: Props) {
  if (!open || !payslip) return null;

  const d = computeColombiaPayrollDeductions(payslip.amount);
  const currency = payslip.currency;
  const createdAt = payslip.createdAt?.toDate() ?? null;
  const payDate = payslip.payDate?.toDate() ?? null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm animate-[fade-in-up_220ms_ease-out]">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold tracking-tight text-[color:var(--color-foreground)]">
                Colilla de pago
              </div>
              <div className="truncate text-xs font-semibold text-[color:var(--color-muted)]">
                {payslip.companyName} · {periodTypeLabel(payslip.periodType)}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(100dvh-2rem)] min-h-0 overflow-y-auto px-5 py-4">
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                Periodo
              </div>
              <div className="mt-1 text-xs font-extrabold text-[color:var(--color-foreground)]">
                {periodLabel(payslip)}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <Row
                  label="Fecha de pago"
                  value={payDate ? formatDateWithWeekday(payDate) : "—"}
                  muted
                />
                <Row
                  label="Generado"
                  value={createdAt ? formatDateWithWeekday(createdAt) : "—"}
                  muted
                />
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                Devengados
              </div>
              <div className="mt-3 space-y-2">
                <Row label="Salario" value={formatMoney(d.base, currency)} />
                <div className="border-t border-[color:var(--color-border)] pt-2">
                  <Row label="Total devengado" value={formatMoney(d.base, currency)} />
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                Deducciones
              </div>
              <div className="mt-3 space-y-2">
                <Row label="Salud (4%)" value={formatMoney(d.health, currency)} />
                <Row label="Pensión (4%)" value={formatMoney(d.pension, currency)} />
                <div className="border-t border-[color:var(--color-border)] pt-2">
                  <Row label="Total deducciones" value={formatMoney(d.total, currency)} />
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-green)] p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                Neto a pagar
              </div>
              <div className="mt-1 text-lg font-extrabold tracking-tight text-[color:var(--color-foreground)]">
                {formatMoney(d.net, currency)}
              </div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
                Deducciones mostradas: Salud 4% + Pensión 4% (empleado).
              </div>
            </div>
          </div>

          <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar colilla"
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm font-extrabold text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

