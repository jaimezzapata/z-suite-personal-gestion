"use client";

import { Pencil, Plus, Receipt, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Expense, ExpenseCategory, ExpenseInput } from "@/features/expenses/types";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/features/expenses/services/expensesService";
import { expenseCategoryLabel } from "@/features/expenses/utils/labels";
import type { BiweeklyPart, ExpensePeriodType } from "@/features/expenses/utils/periods";
import { getBiweeklyRange, getMonthlyRange } from "@/features/expenses/utils/periods";
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";
import { formatCop, formatDateWithWeekday } from "@/shared/utils/format";

import { ExpenseFormModal } from "./ExpenseFormModal";
import { ExpensesConfigModal, type ExpensesFilters } from "./ExpensesConfigModal";

type Props = {
  uid: string;
};

function nowParts() {
  const now = new Date();
  return { year: now.getFullYear(), month1Based: now.getMonth() + 1 };
}

export function ExpensesView({ uid }: Props) {
  const { expenses, loading, error } = useExpenses(uid);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [configOpen, setConfigOpen] = useState(false);
  const [filters, setFilters] = useState<ExpensesFilters>(() => ({
    periodType: "biweekly",
    biweeklyPart: 1,
    year: 2000,
    month1Based: 1,
    category: "ALL",
  }));

  useEffect(() => {
    setFilters((f) => {
      if (f.year !== 2000 || f.month1Based !== 1) return f;
      const parts = nowParts();
      return {
        ...f,
        year: parts.year,
        month1Based: parts.month1Based,
        biweeklyPart: (new Date().getDate() <= 15 ? 1 : 2) as BiweeklyPart,
      };
    });
  }, []);

  const range = useMemo(() => {
    if (filters.periodType === "monthly") {
      return getMonthlyRange(filters.year, filters.month1Based);
    }
    return getBiweeklyRange(filters.year, filters.month1Based, filters.biweeklyPart);
  }, [filters]);

  const filtered = useMemo(() => {
    const start = range.start.getTime();
    const end = range.end.getTime();
    return expenses.filter((e) => {
      const t = e.date.toDate().getTime();
      if (t < start || t > end) return false;
      if (filters.category !== "ALL" && e.category !== filters.category) return false;
      return true;
    });
  }, [expenses, filters.category, range]);

  const totals = useMemo(() => {
    let total = 0;
    for (const e of filtered) total += e.amount;
    return total;
  }, [filtered]);

  const empty = useMemo(() => !loading && filtered.length === 0, [loading, filtered.length]);

  async function handleCreate(input: ExpenseInput) {
    try {
      await createExpense(uid, input);
      toast.success({ title: "Listo", message: "Gasto creado" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo crear el gasto",
      });
      throw e;
    }
  }

  async function handleUpdate(input: ExpenseInput) {
    if (!editing) return;
    try {
      await updateExpense(uid, editing.id, input);
      toast.success({ title: "Listo", message: "Gasto actualizado" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo actualizar el gasto",
      });
      throw e;
    }
  }

  async function handleDelete(expense: Expense) {
    if (busyId) return;
    const ok = await confirm({
      title: "Eliminar gasto",
      message: `¿Eliminar este gasto de ${formatCop(expense.amount)}?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(expense.id);
    try {
      await deleteExpense(uid, expense.id);
      toast.success({ title: "Listo", message: "Gasto eliminado" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo eliminar el gasto",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)]">
            <Receipt className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Gastos
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              Valor + categoría (fecha automática, COP).
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            aria-label="Configuración"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)]"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            aria-label="Nuevo gasto"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--color-foreground)]">
          {filters.periodType === "monthly" ? "MES" : `Q${filters.biweeklyPart}`} ·{" "}
          {formatDateWithWeekday(range.start)} - {formatDateWithWeekday(range.end)}
        </span>
        {filters.category !== "ALL" ? (
          <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--postit-blue)] px-3 py-1 text-xs font-semibold text-[color:var(--color-foreground)]">
            {expenseCategoryLabel(filters.category as ExpenseCategory)}
          </span>
        ) : null}
        <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)] px-3 py-1 text-xs font-semibold text-[color:var(--color-foreground)]">
          TOTAL: {formatCop(totals)}
        </span>
      </div>

      {error ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
          {error}
        </div>
      ) : null}

      {empty ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
            No hay gastos
          </div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Registra un gasto para verlo aquí.
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((e, idx) => {
          const bg =
            idx % 4 === 0
              ? "bg-[color:var(--postit-yellow)]"
              : idx % 4 === 1
                ? "bg-[color:var(--postit-blue)]"
                : idx % 4 === 2
                  ? "bg-[color:var(--postit-green)]"
                  : "bg-[color:var(--postit-purple)]";

          return (
            <div
              key={e.id}
              className={[
                "rounded-3xl border border-[color:var(--color-border)] p-4 shadow-sm",
                bg,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
                    {expenseCategoryLabel(e.category)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
                    {formatDateWithWeekday(e.date.toDate())}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                    {formatCop(e.amount)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(e);
                      setModalOpen(true);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 text-[color:var(--color-foreground)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e)}
                    disabled={busyId === e.id}
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

      <ExpenseFormModal
        open={modalOpen}
        title={editing ? "Editar gasto" : "Nuevo gasto"}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      <ExpensesConfigModal
        open={configOpen}
        value={filters}
        onClose={() => setConfigOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setConfigOpen(false);
        }}
      />
    </div>
  );
}
