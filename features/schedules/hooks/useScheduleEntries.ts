"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import type { InstitutionKind, ScheduleEntry } from "@/features/schedules/types";
import { firestore } from "@/shared/firebase/firestore";

type State = {
  entries: ScheduleEntry[];
  loading: boolean;
  error: string | null;
};

type ScheduleEntryDoc = Omit<ScheduleEntry, "id"> & {
  institutionKind?: unknown;
  institutionName?: string | null;
  name?: string;
  room?: string | null;
  dateKey?: unknown;
  startMinutes?: unknown;
  endMinutes?: unknown;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

function coerceInstitutionKind(value: unknown): InstitutionKind {
  if (value === "CESDE" || value === "SENA" || value === "OTRA") return value;
  return "OTRA";
}

function coerceDateKey(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "2000-01-01";
}

function coerceMinutes(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 24 * 60) return 24 * 60;
  return Math.floor(n);
}

export function useScheduleEntries(
  uid: string | null | undefined,
  range: { startKey: string; endKey: string },
): State {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = useMemo(() => (uid ? `users/${uid}/schedules` : null), [uid]);

  useEffect(() => {
    if (!path) {
      setEntries([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const col = collection(firestore, path);
    const q = query(
      col,
      where("dateKey", ">=", range.startKey),
      where("dateKey", "<=", range.endKey),
      orderBy("dateKey", "asc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => {
            const data = d.data() as ScheduleEntryDoc;
            return {
              id: d.id,
              dateKey: coerceDateKey(data.dateKey),
              institutionKind: coerceInstitutionKind(data.institutionKind),
              institutionName: data.institutionName ?? undefined,
              name: data.name ?? "",
              startMinutes: coerceMinutes(data.startMinutes),
              endMinutes: coerceMinutes(data.endMinutes),
              room: data.room ?? undefined,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            } satisfies ScheduleEntry;
          })
          .sort((a, b) => {
            if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
            if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
            return a.name.localeCompare(b.name);
          });

        setEntries(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Error al leer horarios");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [path, range.endKey, range.startKey]);

  return { entries, loading, error };
}

