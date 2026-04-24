"use client";

import { BarChart3, CreditCard, PiggyBank, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { usePayslips } from "@/features/payslips/hooks/usePayslips";
import type { Payslip } from "@/features/payslips/types";
import { useCurrentUser } from "@/shared/auth/CurrentUserContext";
import { isDarkHex, isValidHex, normalizeHex } from "@/shared/utils/color";
import { formatMoney } from "@/shared/utils/format";

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
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 36;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full">
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export function DashboardView() {
  const { uid } = useCurrentUser();
  const { companies, loading: companiesLoading } = useCompanies(uid);
  const { payslips, loading: payslipsLoading } = usePayslips(uid);
  const { expenses, loading: expensesLoading } = useExpenses(uid);

  const [period, setPeriod] = useState<{ year: number; month1Based: number }>({
    year: 2000,
    month1Based: 1,
  });

  useEffect(() => {
    const now = new Date();
    setPeriod({ year: now.getFullYear(), month1Based: now.getMonth() + 1 });
  }, []);

  const loading = companiesLoading || payslipsLoading || expensesLoading;

  const { filteredPayslips, totalIncome } = useMemo(() => {
    const key = monthKey(period.year, period.month1Based);
    const filtered = payslips.filter((p) => p.periodKey.startsWith(`${key}-`));
    return { filteredPayslips: filtered, totalIncome: sumPayslips(filtered) };
  }, [payslips, period.year, period.month1Based]);

  const { totalExpenses, expensesByCategory } = useMemo(() => {
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
    return { totalExpenses: total, expensesByCategory: items };
  }, [expenses, period.year, period.month1Based]);

  const available = totalIncome;
  const savings = available - totalExpenses;

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
              Disponible (colillas)
            </div>
            <Wallet className="h-4 w-4 text-[color:var(--color-foreground)]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {loading ? "…" : formatMoney(available, "COP")}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            Suma de colillas del periodo
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-purple)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--color-foreground)]">
              Gastos
            </div>
            <CreditCard className="h-4 w-4 text-[color:var(--color-foreground)]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">
            {loading ? "…" : formatMoney(totalExpenses, "COP")}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            Total de gastos del periodo
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
            {loading ? "…" : formatMoney(savings, "COP")}
          </div>
          <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
            Disponible − gastos
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
            <BarList items={incomeByCompany} />
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
            <div className="space-y-2">
              {expensesByCategory.map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
                >
                  <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {c.category}
                  </div>
                  <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {formatMoney(c.value, "COP")}
                  </div>
                </div>
              ))}
              <div className="mt-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--color-muted)]">
                Total: {formatMoney(totalExpenses, "COP")}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
              Aún no hay gastos en este periodo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

