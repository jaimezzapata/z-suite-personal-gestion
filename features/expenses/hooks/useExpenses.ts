"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import type { Expense, ExpenseCategory } from "@/features/expenses/types";
import { EXPENSE_CATEGORIES } from "@/features/expenses/utils/categories";
import { firestore } from "@/shared/firebase/firestore";

type State = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
};

type ExpenseDoc = Omit<Expense, "id" | "date"> & {
  date: Timestamp;
  currency?: unknown;
  category?: unknown;
  counterpartyName?: unknown;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

function coerceCategory(value: unknown): ExpenseCategory {
  if (typeof value === "string" && (EXPENSE_CATEGORIES as string[]).includes(value)) {
    return value as ExpenseCategory;
  }
  return "OTROS";
}

function coerceCounterpartyName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function useExpenses(uid: string | null | undefined): State {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(() => (uid ? `users/${uid}/expenses` : null), [uid]);

  useEffect(() => {
    if (!path) {
      setExpenses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const col = collection(firestore, path);
    const q = query(col, orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() as ExpenseDoc;
          return {
            id: d.id,
            amount: data.amount,
            currency: "COP",
            category: coerceCategory(data.category),
            counterpartyName: coerceCounterpartyName(data.counterpartyName),
            date: data.date,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } satisfies Expense;
        });
        setExpenses(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Error al leer gastos");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [path]);

  return { expenses, loading, error };
}
