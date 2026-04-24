"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import type { Payslip } from "@/features/payslips/types";
import { firestore } from "@/shared/firebase/firestore";

type State = {
  payslips: Payslip[];
  loading: boolean;
  error: string | null;
};

type PayslipDoc = Omit<Payslip, "id" | "periodStart" | "periodEnd" | "payDate"> & {
  periodStart: Timestamp;
  periodEnd: Timestamp;
  payDate?: Timestamp | null;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function usePayslips(uid: string | null | undefined): State {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(() => (uid ? `users/${uid}/payslips` : null), [uid]);

  useEffect(() => {
    if (!path) {
      setPayslips([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const col = collection(firestore, path);
    const q = query(col, orderBy("periodStart", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() as PayslipDoc;
          return {
            id: d.id,
            companyId: data.companyId,
            companyName: data.companyName,
            payType: data.payType,
            payFrequency: data.payFrequency,
            currency: data.currency,
            amount: data.amount,
            periodType: data.periodType,
            periodKey: data.periodKey,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            payDate: data.payDate ?? undefined,
            notes: data.notes ?? undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } satisfies Payslip;
        });
        setPayslips(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Error al leer colillas");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [path]);

  return { payslips, loading, error };
}

