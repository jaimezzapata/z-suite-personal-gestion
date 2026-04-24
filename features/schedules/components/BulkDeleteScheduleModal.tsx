"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ScheduleEntryInput } from "@/features/schedules/types";
import {
  deleteScheduleEntriesBulk,
  fetchScheduleEntriesInRange,
} from "@/features/schedules/services/schedulesService";
import { parseDateKey } from "@/features/schedules/utils/dateKey";
import { colombiaHolidayDateKeysForRange } from "@/features/schedules/utils/holidaysCO";
import {
  iterateDateKeysInclusive,
  weekdayFromDateKey,
  type Weekday,
} from "@/features/schedules/utils/range";
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";

const WEEKDAYS: Array<{ d: Weekday; label: string }> = [
  { d: 1, label: "L" },
  { d: 2, label: "M" },
  { d: 3, label: "X" },
  { d: 4, label: "J" },
  { d: 5, label: "V" },
  { d: 6, label: "S" },
  { d: 7, label: "D" },
];

type Props = {
  open: boolean;
  uid: string;
  defaultStartKey: string;
  defaultEndKey: string;
  onClose: () => void;
};

function signatureFromDoc(data: any) {
  const dateKey = typeof data.dateKey === "string" ? data.dateKey : "";
  const institutionKind =
    data.institutionKind === "CESDE" ||
    data.institutionKind === "SENA" ||
    data.institutionKind === "OTRA"
      ? data.institutionKind
      : "OTRA";
  const institutionName = typeof data.institutionName === "string" ? data.institutionName : "";
  const name = typeof data.name === "string" ? data.name : "";
  const startMinutes = typeof data.startMinutes === "number" ? data.startMinutes : 0;
  const endMinutes = typeof data.endMinutes === "number" ? data.endMinutes : 0;
  const room = typeof data.room === "string" ? data.room : "";
  return [
    dateKey,
    institutionKind,
    institutionKind === "OTRA" ? institutionName.trim().toUpperCase() : "",
    name.trim().toUpperCase(),
    startMinutes,
    endMinutes,
    room.trim().toUpperCase(),
  ].join("|");
}

export function BulkDeleteScheduleModal({
  open,
  uid,
  defaultStartKey,
  defaultEndKey,
  onClose,
}: Props) {
  const [startKey, setStartKey] = useState(defaultStartKey);
  const [endKey, setEndKey] = useState(defaultEndKey);
  const [repeatDays, setRepeatDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStartKey(defaultStartKey);
    setEndKey(defaultEndKey);
    setRepeatDays([1, 2, 3, 4, 5]);
    setExcludeHolidays(true);
    setLoading(false);
  }, [defaultEndKey, defaultStartKey, open]);

  const canSubmit = useMemo(() => {
    const start = parseDateKey(startKey);
    const end = parseDateKey(endKey);
    if (!start || !end) return false;
    if (repeatDays.length === 0) return false;
    return true;
  }, [endKey, repeatDays.length, startKey]);

  function toggleWeekday(d: Weekday) {
    setRepeatDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      return [...prev, d].sort((a, b) => a - b);
    });
  }

  async function handleBulkDelete() {
    if (!canSubmit) return;
    if (loading) return;

    const startParts = parseDateKey(startKey);
    const endParts = parseDateKey(endKey);
    if (!startParts || !endParts) return;

    setLoading(true);
    try {
      console.groupCollapsed("[horarios] bulk delete");
      console.log({ startKey, endKey, repeatDays, excludeHolidays });
      console.groupEnd();

      const dateKeys = iterateDateKeysInclusive(startKey, endKey);
      const repeats = new Set(repeatDays);
      const holidays = excludeHolidays
        ? colombiaHolidayDateKeysForRange(startParts.year, endParts.year)
        : new Set<string>();

      const validDateKeys = new Set<string>();
      let skippedHoliday = 0;
      let skippedNoRepeat = 0;
      for (const dk of dateKeys) {
        const wd = weekdayFromDateKey(dk);
        if (!wd || !repeats.has(wd)) {
          skippedNoRepeat += 1;
          continue;
        }
        if (excludeHolidays && holidays.has(dk)) {
          skippedHoliday += 1;
          continue;
        }
        validDateKeys.add(dk);
      }

      if (validDateKeys.size === 0) {
        toast.info({
          title: "Sin cambios",
          message: "No hay días válidos para eliminar con esta configuración",
        });
        return;
      }

      const docs = await fetchScheduleEntriesInRange(uid, { startKey, endKey });
      const toDelete: string[] = [];
      const seen = new Set<string>();
      for (const d of docs) {
        const dateKey = typeof d.data.dateKey === "string" ? d.data.dateKey : "";
        if (!validDateKeys.has(dateKey)) continue;
        const sig = signatureFromDoc(d.data);
        if (seen.has(sig)) continue;
        seen.add(sig);
        toDelete.push(d.id);
      }

      if (toDelete.length === 0) {
        toast.info({ title: "Sin cambios", message: "No se encontraron horarios para eliminar" });
        return;
      }

      const ok = await confirm({
        title: "Eliminar masivo",
        message: `Se eliminarán ${toDelete.length} horarios. Esta acción no se puede deshacer.`,
        okText: "Eliminar",
        cancelText: "Cancelar",
        variant: "danger",
      });
      if (!ok) return;

      const { deleted } = await deleteScheduleEntriesBulk(uid, toDelete);
      toast.success({
        title: "Listo",
        message: `Eliminados: ${deleted}. Festivos excluidos: ${skippedHoliday}. Fuera de repetición: ${skippedNoRepeat}.`,
      });
      onClose();
    } catch (e) {
      console.error("[horarios] bulk delete error", e);
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo eliminar en masivo",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="absolute inset-0 grid place-items-center px-4 py-10">
        <div className="w-full max-w-lg animate-[fade-in-up_220ms_ease-out] rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)]">
                <Trash2 className="h-5 w-5 text-[color:var(--color-foreground)]" />
              </span>
              <div>
                <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  Eliminar masivo
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  Elimina horarios en un rango de fechas.
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
                  Fecha inicio
                </label>
                <input
                  value={startKey}
                  onChange={(e) => setStartKey(e.target.value)}
                  type="date"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Fecha fin
                </label>
                <input
                  value={endKey}
                  onChange={(e) => setEndKey(e.target.value)}
                  type="date"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Días a eliminar
              </label>
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS.map(({ d, label }) => {
                  const active = repeatDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      aria-pressed={active}
                      className={[
                        "h-11 rounded-2xl border text-sm font-extrabold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                        active
                          ? "border-[color:var(--color-danger)] bg-[color:var(--postit-pink)] text-[color:var(--color-foreground)]"
                          : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  Excluir festivos (Colombia)
                </div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  No elimina días festivos.
                </div>
              </div>
              <input
                type="checkbox"
                checked={excludeHolidays}
                onChange={(e) => setExcludeHolidays(e.target.checked)}
                className="h-5 w-5 accent-[color:var(--color-primary)]"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={loading || !canSubmit}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[color:var(--color-danger)] px-4 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
