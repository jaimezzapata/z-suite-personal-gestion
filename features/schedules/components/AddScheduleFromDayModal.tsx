"use client";

import type { LucideIcon } from "lucide-react";
import { Building2, CopyPlus, Save, School, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { InstitutionKind, ScheduleEntryInput } from "@/features/schedules/types";
import {
  createScheduleEntriesBulk,
  createScheduleEntry,
  fetchScheduleEntrySignaturesInRange,
} from "@/features/schedules/services/schedulesService";
import { parseDateKey } from "@/features/schedules/utils/dateKey";
import { colombiaHolidayDateKeysForRange } from "@/features/schedules/utils/holidaysCO";
import {
  iterateDateKeysInclusive,
  weekdayFromDateKey,
  type Weekday,
} from "@/features/schedules/utils/range";
import { timeToMinutes } from "@/features/schedules/utils/time";
import { toast } from "@/shared/ui/toast";

const INSTITUTIONS: Array<{
  kind: InstitutionKind;
  label: string;
  Icon: LucideIcon;
  bgClass: string;
}> = [
  { kind: "CESDE", label: "CESDE", Icon: School, bgClass: "bg-[color:var(--postit-yellow)]" },
  { kind: "SENA", label: "SENA", Icon: Building2, bgClass: "bg-[color:var(--postit-green)]" },
  { kind: "OTRA", label: "OTRA", Icon: Building2, bgClass: "bg-[color:var(--postit-blue)]" },
];

const WEEKDAYS: Array<{ d: Weekday; label: string }> = [
  { d: 1, label: "L" },
  { d: 2, label: "M" },
  { d: 3, label: "X" },
  { d: 4, label: "J" },
  { d: 5, label: "V" },
  { d: 6, label: "S" },
  { d: 7, label: "D" },
];

type Mode = "single" | "bulk";

type Props = {
  open: boolean;
  uid: string;
  dateKey: string;
  defaultBulkEndKey: string;
  onClose: () => void;
};

export function AddScheduleFromDayModal({
  open,
  uid,
  dateKey,
  defaultBulkEndKey,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("single");

  const [singleDateKey, setSingleDateKey] = useState(dateKey);
  const [bulkStartKey, setBulkStartKey] = useState(dateKey);
  const [bulkEndKey, setBulkEndKey] = useState(defaultBulkEndKey);
  const [repeatDays, setRepeatDays] = useState<Weekday[]>([]);
  const [excludeHolidays, setExcludeHolidays] = useState(true);

  const [institutionKind, setInstitutionKind] = useState<InstitutionKind>("CESDE");
  const [institutionName, setInstitutionName] = useState("");
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("08:00");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("single");
    setSingleDateKey(dateKey);
    setBulkStartKey(dateKey);
    setBulkEndKey(defaultBulkEndKey);
    const wd = weekdayFromDateKey(dateKey);
    setRepeatDays(wd ? [wd] : [1, 2, 3, 4, 5]);
    setExcludeHolidays(true);
    setInstitutionKind("CESDE");
    setInstitutionName("");
    setName("");
    setStartTime("07:00");
    setEndTime("08:00");
    setRoom("");
    setLoading(false);
  }, [dateKey, defaultBulkEndKey, open]);

  const canSubmit = useMemo(() => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes == null || endMinutes == null) return false;
    if (endMinutes <= startMinutes) return false;
    if (!name.trim()) return false;
    if (institutionKind === "OTRA" && !institutionName.trim()) return false;

    if (mode === "single") {
      return !!parseDateKey(singleDateKey);
    }
    if (!parseDateKey(bulkStartKey) || !parseDateKey(bulkEndKey)) return false;
    if (repeatDays.length === 0) return false;
    return true;
  }, [
    bulkEndKey,
    bulkStartKey,
    endTime,
    institutionKind,
    institutionName,
    mode,
    name,
    repeatDays.length,
    singleDateKey,
    startTime,
  ]);

  function toggleWeekday(d: Weekday) {
    setRepeatDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      return [...prev, d].sort((a, b) => a - b);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (loading) return;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes == null || endMinutes == null) return;
    if (endMinutes <= startMinutes) return;

    setLoading(true);
    try {
      if (mode === "single") {
        const input: ScheduleEntryInput = {
          dateKey: singleDateKey,
          institutionKind,
          institutionName: institutionKind === "OTRA" ? institutionName.trim() : undefined,
          name: name.trim(),
          startMinutes,
          endMinutes,
          room: room.trim() ? room.trim() : undefined,
        };
        await createScheduleEntry(uid, input);
        toast.success({ title: "Listo", message: "Horario creado" });
        onClose();
        return;
      }

      const startParts = parseDateKey(bulkStartKey);
      const endParts = parseDateKey(bulkEndKey);
      if (!startParts || !endParts) return;

      const dateKeys = iterateDateKeysInclusive(bulkStartKey, bulkEndKey);
      const repeats = new Set(repeatDays);
      const holidays = excludeHolidays
        ? colombiaHolidayDateKeysForRange(startParts.year, endParts.year)
        : new Set<string>();

      const inputs: ScheduleEntryInput[] = [];
      for (const dk of dateKeys) {
        const wd = weekdayFromDateKey(dk);
        if (!wd || !repeats.has(wd)) continue;
        if (excludeHolidays && holidays.has(dk)) continue;
        inputs.push({
          dateKey: dk,
          institutionKind,
          institutionName: institutionKind === "OTRA" ? institutionName.trim() : undefined,
          name: name.trim(),
          startMinutes,
          endMinutes,
          room: room.trim() ? room.trim() : undefined,
        });
      }

      if (inputs.length === 0) {
        toast.info({
          title: "Sin cambios",
          message: "No hay días válidos para crear horarios con esta configuración",
        });
        return;
      }

      const existing = await fetchScheduleEntrySignaturesInRange(uid, {
        startKey: bulkStartKey,
        endKey: bulkEndKey,
      });
      const { created, skipped } = await createScheduleEntriesBulk(uid, inputs, {
        existingSignatures: existing,
      });

      toast.success({
        title: "Listo",
        message: `Creados: ${created}. Omitidos: ${skipped}.`,
      });
      onClose();
    } catch (e) {
      console.error("[horarios] add from day error", e);
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo guardar",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="flex w-full max-w-lg max-h-[calc(100dvh-2rem)] animate-[fade-in-up_220ms_ease-out] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                Registrar horario
              </div>
              <div className="text-sm text-[color:var(--color-muted)]">
                Elige si es solo para este día o masivo.
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

          <div className="grid grid-cols-2 gap-2 px-6 pb-4">
            <button
              type="button"
              onClick={() => setMode("single")}
              aria-pressed={mode === "single"}
              className={[
                "h-11 rounded-2xl border text-sm font-extrabold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                mode === "single"
                  ? "border-[color:var(--color-primary)] bg-[color:var(--postit-yellow)] text-[color:var(--color-foreground)]"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
              ].join(" ")}
            >
              Solo este día
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              aria-pressed={mode === "bulk"}
              className={[
                "h-11 rounded-2xl border text-sm font-extrabold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                mode === "bulk"
                  ? "border-[color:var(--color-primary)] bg-[color:var(--postit-blue)] text-[color:var(--color-foreground)]"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
              ].join(" ")}
            >
              Masivo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
              {mode === "single" ? (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                    Fecha
                  </label>
                  <input
                    value={singleDateKey}
                    onChange={(e) => setSingleDateKey(e.target.value)}
                    type="date"
                    className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                        Fecha inicio
                      </label>
                      <input
                        value={bulkStartKey}
                        onChange={(e) => setBulkStartKey(e.target.value)}
                        type="date"
                        className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                        Fecha fin
                      </label>
                      <input
                        value={bulkEndKey}
                        onChange={(e) => setBulkEndKey(e.target.value)}
                        type="date"
                        className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                      Días que se repite
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
                                ? "border-[color:var(--color-primary)] bg-[color:var(--postit-yellow)] text-[color:var(--color-foreground)]"
                                : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        Excluir festivos (Colombia)
                      </div>
                      <div className="text-xs text-[color:var(--color-muted)]">
                        No crea clases en días festivos.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={excludeHolidays}
                      onChange={(e) => setExcludeHolidays(e.target.checked)}
                      className="h-5 w-5 accent-[color:var(--color-primary)]"
                    />
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Institución
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {INSTITUTIONS.map(({ kind, label, Icon, bgClass }) => {
                    const active = institutionKind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setInstitutionKind(kind)}
                        aria-pressed={active}
                        className={[
                          "flex h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                          active
                            ? "border-[color:var(--color-primary)] bg-[color:var(--color-surface)] shadow-sm"
                            : "border-[color:var(--color-border)] bg-[color:var(--color-surface)]",
                        ].join(" ")}
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

              {institutionKind === "OTRA" ? (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                    Nombre institución
                  </label>
                  <input
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Ej. UNIVERSIDAD"
                    className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                  />
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Nombre clase
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. PROGRAMACIÓN"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                    Hora inicio
                  </label>
                  <input
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    type="time"
                    className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                    Hora fin
                  </label>
                  <input
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    type="time"
                    className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Sala / ambiente (opcional)
                </label>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Ej. SALA 302"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-11 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-semibold text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                {mode === "bulk" ? <CopyPlus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {mode === "bulk" ? "Crear grupo" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
