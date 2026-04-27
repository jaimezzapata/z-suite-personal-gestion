"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bus,
  CreditCard,
  Dumbbell,
  Fuel,
  Heart,
  Home,
  Laptop,
  Layers,
  PartyPopper,
  PlugZap,
  Receipt,
  Shirt,
  Shapes,
  SlidersHorizontal,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { ExpenseCategory } from "@/features/expenses/types";
import { EXPENSE_CATEGORIES } from "@/features/expenses/utils/categories";
import type { BiweeklyPart, ExpensePeriodType } from "@/features/expenses/utils/periods";

export type ExpensesFilters = {
  periodType: ExpensePeriodType;
  biweeklyPart: BiweeklyPart;
  year: number;
  month1Based: number;
  category: ExpenseCategory | "ALL";
};

const CATEGORY_ICON: Record<ExpenseCategory, LucideIcon> = {
  DEUDAS: CreditCard,
  COMIDA: Utensils,
  PASAJES: Bus,
  GASOLINA: Fuel,
  CASA: Home,
  SERVICIOS: PlugZap,
  ROPA: Shirt,
  ZAPATOS: ShoppingBag,
  FIESTA: PartyPopper,
  CITAS: Heart,
  GIMNASIO: Dumbbell,
  TECNOLOGIA: Laptop,
  OTROS: Shapes,
};

type Props = {
  open: boolean;
  value: ExpensesFilters;
  onClose: () => void;
  onApply: (next: ExpensesFilters) => void;
};

export function ExpensesConfigModal({ open, value, onClose, onApply }: Props) {
  const [periodType, setPeriodType] = useState<ExpensePeriodType>("biweekly");
  const [biweeklyPart, setBiweeklyPart] = useState<BiweeklyPart>(1);
  const [year, setYear] = useState<number>(2000);
  const [month1Based, setMonth1Based] = useState<number>(1);
  const [category, setCategory] = useState<ExpenseCategory | "ALL">("ALL");

  useEffect(() => {
    if (!open) return;
    setPeriodType(value.periodType);
    setBiweeklyPart(value.biweeklyPart);
    setYear(value.year);
    setMonth1Based(value.month1Based);
    setCategory(value.category);
  }, [open, value]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="absolute inset-0 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md animate-[fade-in-up_220ms_ease-out] rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-blue)]">
                <SlidersHorizontal className="h-5 w-5 text-[color:var(--color-foreground)]" />
              </span>
              <div>
                <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  Configuración
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  Define los filtros para tu listado de gastos.
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

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Periodo
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBiweeklyPart(1)}
                    aria-pressed={biweeklyPart === 1}
                    className={[
                      "h-11 rounded-2xl border text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      biweeklyPart === 1
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] shadow-sm text-[color:var(--color-foreground)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
                    ].join(" ")}
                  >
                    Q1 (1-15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiweeklyPart(2)}
                    aria-pressed={biweeklyPart === 2}
                    className={[
                      "h-11 rounded-2xl border text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      biweeklyPart === 2
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] shadow-sm text-[color:var(--color-foreground)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
                    ].join(" ")}
                  >
                    Q2 (16-fin)
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Categoría
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setCategory("ALL")}
                  aria-pressed={category === "ALL"}
                  className={[
                    "flex h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                    category === "ALL"
                      ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] shadow-sm"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
                  ].join(" ")}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
                    <Layers className="h-4 w-4 text-[color:var(--color-foreground)]" />
                  </span>
                  <span className="truncate text-[color:var(--color-foreground)]">Todas</span>
                </button>

                {EXPENSE_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c];
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={active}
                      className={[
                        "flex h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                        active
                          ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] shadow-sm"
                          : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
                      ].join(" ")}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]">
                        <Icon className="h-4 w-4 text-[color:var(--color-foreground)]" />
                      </span>
                      <span className="truncate text-[color:var(--color-foreground)]">
                        {c}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  onApply({ periodType, biweeklyPart, year, month1Based, category })
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
              >
                <Receipt className="h-4 w-4" />
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
