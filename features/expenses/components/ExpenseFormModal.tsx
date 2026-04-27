"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bus,
  CreditCard,
  Fuel,
  Home,
  PlugZap,
  Receipt,
  Save,
  Shapes,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { Expense, ExpenseCategory, ExpenseInput } from "@/features/expenses/types";

const CATEGORY_ITEMS: Array<{
  category: ExpenseCategory;
  label: string;
  Icon: LucideIcon;
  bgClass: string;
}> = [
  { category: "DEUDAS", label: "Deudas", Icon: CreditCard, bgClass: "bg-[color:var(--postit-pink)]" },
  { category: "COMIDA", label: "Comida", Icon: Utensils, bgClass: "bg-[color:var(--postit-yellow)]" },
  { category: "PASAJES", label: "Pasajes", Icon: Bus, bgClass: "bg-[color:var(--postit-blue)]" },
  { category: "GASOLINA", label: "Gasolina", Icon: Fuel, bgClass: "bg-[color:var(--postit-green)]" },
  { category: "CASA", label: "Casa", Icon: Home, bgClass: "bg-[color:var(--postit-purple)]" },
  { category: "SERVICIOS", label: "Servicios", Icon: PlugZap, bgClass: "bg-[color:var(--postit-yellow)]" },
  { category: "OTROS", label: "Otros", Icon: Shapes, bgClass: "bg-[color:var(--postit-blue)]" },
];

type Props = {
  open: boolean;
  title: string;
  initial?: Expense | null;
  onClose: () => void;
  onSubmit: (input: ExpenseInput) => Promise<void>;
};

export function ExpenseFormModal({ open, title, initial, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("COMIDA");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return false;
    return true;
  }, [amount]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setAmount(String(initial.amount));
      setCategory(initial.category);
    } else {
      setAmount("");
      setCategory("COMIDA");
    }
    setLoading(false);
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const input: ExpenseInput = {
        amount: Number(amount),
        category,
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
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="flex w-full max-w-md max-h-[calc(100dvh-2rem)] animate-[fade-in-up_220ms_ease-out] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)]">
                <Receipt className="h-5 w-5 text-[color:var(--color-foreground)]" />
              </span>
              <div>
                <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  {title}
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  Registra un gasto rápido (fecha automática, COP).
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
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
              <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Monto (COP)
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Ej. 35000"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
              </div>

              <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Categoría
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORY_ITEMS.map(({ category: c, label, Icon, bgClass }) => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={[
                        "flex h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                        active
                          ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] shadow-sm"
                          : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      <span
                        className={[
                          "grid h-8 w-8 place-items-center rounded-2xl border border-[color:var(--color-border)]",
                          bgClass,
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4 text-[color:var(--color-foreground)]" />
                      </span>
                      <span className="truncate text-[color:var(--color-foreground)]">{label}</span>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
