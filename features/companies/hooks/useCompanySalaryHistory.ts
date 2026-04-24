"use client";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { firestore } from "@/shared/firebase/firestore";

export type SalaryHistoryEntry = {
  id: string;
  kind: "fixed" | "hourly";
  value: number;
  currency: "COP" | "USD";
  effectiveFrom?: Timestamp;
  createdAt?: Timestamp;
};

type SalaryHistoryDoc = {
  kind: SalaryHistoryEntry["kind"];
  value: number;
  currency: SalaryHistoryEntry["currency"];
  effectiveFrom?: Timestamp;
  createdAt?: Timestamp;
};

type State = {
  items: SalaryHistoryEntry[];
  loading: boolean;
  error: string | null;
};

export function useCompanySalaryHistory(
  uid: string | null | undefined,
  companyId: string | null | undefined,
  take: number = 5,
): State {
  const [items, setItems] = useState<SalaryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(() => {
    if (!uid || !companyId) return null;
    return `users/${uid}/companies/${companyId}/salaryHistory`;
  }, [uid, companyId]);

  useEffect(() => {
    if (!path) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const col = collection(firestore, path);
    const q = query(col, orderBy("createdAt", "desc"), limit(take));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() as SalaryHistoryDoc;
          return {
            id: d.id,
            kind: data.kind,
            value: data.value,
            currency: data.currency,
            effectiveFrom: data.effectiveFrom,
            createdAt: data.createdAt,
          } satisfies SalaryHistoryEntry;
        });
        setItems(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Error al leer historial salarial");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [path, take]);

  return { items, loading, error };
}

