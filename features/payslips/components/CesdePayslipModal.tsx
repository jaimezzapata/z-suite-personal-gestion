"use client";

import { X } from "lucide-react";
import { useMemo } from "react";

import type { Payslip } from "@/features/payslips/types";
import { computeColombiaPayrollDeductions } from "@/features/payslips/utils/colombiaPayroll";
import { periodLabel, periodTypeLabel } from "@/features/payslips/utils/labels";
import { useScheduleEntries } from "@/features/schedules/hooks/useScheduleEntries";
import { dateKeyFromParts } from "@/features/schedules/utils/dateKey";
import { formatHoursForInstitution, minutesToTime } from "@/features/schedules/utils/time";
import { formatDateKeyWithWeekday, formatDateWithWeekday, formatMoney } from "@/shared/utils/format";

type Props = {
  open: boolean;
  uid: string;
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

export function CesdePayslipModal({ open, uid, payslip, onClose }: Props) {
  if (!open || !payslip) return null;

  const d = computeColombiaPayrollDeductions(payslip.amount);
  const currency = payslip.currency;
  const createdAt = payslip.createdAt?.toDate() ?? null;
  const payDate = payslip.payDate?.toDate() ?? null;

  const range = useMemo(() => {
    const start = payslip.periodStart.toDate();
    const end = payslip.periodEnd.toDate();
    const startKey = dateKeyFromParts(start.getFullYear(), start.getMonth() + 1, start.getDate());
    const endKey = dateKeyFromParts(end.getFullYear(), end.getMonth() + 1, end.getDate());
    return { startKey, endKey };
  }, [payslip.periodEnd, payslip.periodStart]);

  const schedules = useScheduleEntries(uid, range);

  const hoursDetail = useMemo(() => {
    const byDay = new Map<
      string,
      {
        minutes: number;
        items: Array<{ subject: string; hours: number; startMinutes: number; endMinutes: number }>;
      }
    >();

    for (const e of schedules.entries) {
      if (e.institutionKind !== "CESDE") continue;
      const minutes = Math.max(0, e.endMinutes - e.startMinutes);
      const hours = formatHoursForInstitution(minutes, "CESDE");
      const prev = byDay.get(e.dateKey) ?? { minutes: 0, items: [] };
      prev.minutes += minutes;
      prev.items.push({
        subject: e.name?.trim() ? e.name.trim() : "—",
        hours,
        startMinutes: e.startMinutes,
        endMinutes: e.endMinutes,
      });
      byDay.set(e.dateKey, prev);
    }

    const days = [...byDay.entries()]
      .map(([dateKey, v]) => ({
        dateKey,
        totalHours: formatHoursForInstitution(v.minutes, "CESDE"),
        items: [...v.items].sort((a, b) => a.startMinutes - b.startMinutes),
      }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const totalMinutes = [...byDay.values()].reduce((acc, v) => acc + v.minutes, 0);
    const totalHours = formatHoursForInstitution(totalMinutes, "CESDE");
    const totalClasses = [...byDay.values()].reduce((acc, v) => acc + v.items.length, 0);

    return { days, totalHours, totalClasses };
  }, [schedules.entries]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm animate-[fade-in-up_220ms_ease-out]">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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

            <div className="mt-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                    Horas (según horarios)
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-[color:var(--color-muted)]">
                    {formatDateKeyWithWeekday(range.startKey)} → {formatDateKeyWithWeekday(range.endKey)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                    Total
                  </div>
                  <div className="mt-1 whitespace-nowrap text-sm font-extrabold text-[color:var(--color-foreground)]">
                    {schedules.loading ? "…" : `${hoursDetail.totalHours} H`}
                  </div>
                  <div className="mt-0.5 whitespace-nowrap text-[11px] font-semibold text-[color:var(--color-muted)]">
                    {schedules.loading ? "…" : `${hoursDetail.totalClasses} clases`}
                  </div>
                </div>
              </div>

              {schedules.error ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] px-3 py-2 text-sm text-[color:var(--color-foreground)]">
                  {schedules.error}
                </div>
              ) : null}

              {!schedules.loading && !schedules.error && !hoursDetail.days.length ? (
                <div className="mt-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-sm text-[color:var(--color-muted)]">
                  No hay clases CESDE registradas en este periodo.
                </div>
              ) : null}

              {!schedules.loading && !schedules.error && hoursDetail.days.length ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
                  <div className="grid grid-cols-[92px_1fr_78px_44px] gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                    <div>Día</div>
                    <div className="min-w-0">Materia</div>
                    <div className="text-right">Horario</div>
                    <div className="text-right">H</div>
                  </div>

                  <div className="divide-y divide-[color:var(--color-border)]">
                    {(() => {
                      const rows = hoursDetail.days.flatMap((day) =>
                        day.items.map((it, idx) => ({
                          key: `${day.dateKey}-${it.subject}-${it.startMinutes}-${idx}`,
                          dateKey: day.dateKey,
                          subject: it.subject,
                          startMinutes: it.startMinutes,
                          endMinutes: it.endMinutes,
                          hours: it.hours,
                        })),
                      );

                      return rows.map((r) => {
                        const dayLabel = formatDateKeyWithWeekday(r.dateKey);
                        return (
                          <div
                            key={r.key}
                            className="grid grid-cols-[92px_1fr_78px_44px] gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--color-foreground)]"
                          >
                            <div className="min-w-0 truncate text-[11px] font-extrabold text-[color:var(--color-muted)]" title={dayLabel}>
                              {dayLabel}
                            </div>
                            <div className="min-w-0 truncate text-sm font-extrabold" title={r.subject}>
                              {r.subject}
                            </div>
                            <div className="whitespace-nowrap text-right text-[11px] font-semibold text-[color:var(--color-muted)]">
                              {minutesToTime(r.startMinutes)}-{minutesToTime(r.endMinutes)}
                            </div>
                            <div className="whitespace-nowrap text-right text-sm font-extrabold tabular-nums">
                              {r.hours}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : null}
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
