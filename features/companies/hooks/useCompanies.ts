"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import type { Company } from "@/features/companies/types";
import { firestore } from "@/shared/firebase/firestore";

type CompaniesState = {
  companies: Company[];
  loading: boolean;
  error: string | null;
};

type CompanyDoc = {
  name: string;
  payType: Company["payType"];
  payFrequency: Company["payFrequency"];
  currency?: Company["currency"];
  active?: boolean;
  contractStartDate?: Timestamp | null;
  contractEndDate?: Timestamp | null;
  notes?: string | null;
  hourlyRate?: number | null;
  fixedSalary?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function useCompanies(uid: string | null | undefined): CompaniesState {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(() => (uid ? `users/${uid}/companies` : null), [uid]);

  useEffect(() => {
    if (!path) {
      setCompanies([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const col = collection(firestore, path);
    const q = query(col, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next: Company[] = snap.docs.map((d) => {
          const data = d.data() as CompanyDoc;
          return {
            id: d.id,
            name: data.name,
            payType: data.payType,
            payFrequency: data.payFrequency,
            currency: data.currency ?? "COP",
            active: data.active ?? true,
            contractStartDate: data.contractStartDate ?? undefined,
            contractEndDate: data.contractEndDate ?? undefined,
            notes: data.notes ?? undefined,
            hourlyRate: data.hourlyRate ?? undefined,
            fixedSalary: data.fixedSalary ?? undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setCompanies(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Error al leer empresas");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [path]);

  return { companies, loading, error };
}
