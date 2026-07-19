"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";

import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useScheduleEntries } from "@/features/schedules/hooks/useScheduleEntries";
import type { InstitutionKind, ScheduleEntry, ScheduleEntryInput } from "@/features/schedules/types";
import {
  createScheduleEntry,
  deleteScheduleEntriesBulk,
  deleteScheduleEntry,
  fetchLastScheduleDateKeyFrom,
  fetchScheduleEntriesFromDate,
  updateScheduleEntry,
} from "@/features/schedules/services/schedulesService";
import { buildMonthGrid, monthLabel } from "@/features/schedules/utils/calendar";
import { dateKeyFromParts, parseDateKey } from "@/features/schedules/utils/dateKey";
import {
  formatDurationMinutes,
  formatHoursForInstitution,
  minutesPerHourUnit,
  minutesToTime,
} from "@/features/schedules/utils/time";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";
import { formatDateKeyWithWeekday } from "@/shared/utils/format";

import { ScheduleFormModal } from "./ScheduleFormModal";
import { DeleteGroupModal } from "./DeleteGroupModal";
import { AddScheduleFromDayModal } from "./AddScheduleFromDayModal";
import styles from "./SchedulesCalendar.module.css";

type Props = {
  uid: string;
};

function isValidHex(value: string) {
  return /^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(value.trim().toUpperCase());
}

function institutionLabel(kind: InstitutionKind, name?: string) {
  if (kind === "OTRA") return name?.trim() ? name : "OTRA";
  return kind;
}

function formatDateKeyLabel(dateKey: string) {
  return formatDateKeyWithWeekday(dateKey);
}

function dateFromDateKey(dateKey: string) {
  const parts = parseDateKey(dateKey);
  if (!parts) return new Date();
  return new Date(parts.year, parts.month1Based - 1, parts.day);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatCompactHours(hours: number) {
  const h = round1(hours);
  if (!Number.isFinite(h) || h <= 0) return "";
  return `${h}H`;
}

function primaryHeatColor(alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(107, 124, 255, ${a})`;
}

export function SchedulesView({ uid }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [viewYear, setViewYear] = useState(2000);
  const [viewMonth1Based, setViewMonth1Based] = useState(1);
  const [selectedDateKey, setSelectedDateKey] = useState("2000-01-01");
  const [optimisticallyHiddenIds, setOptimisticallyHiddenIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    setViewYear(y);
    setViewMonth1Based(m);
    setSelectedDateKey(dateKeyFromParts(y, m, d));
  }, []);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth1Based),
    [viewMonth1Based, viewYear],
  );

  const range = useMemo(() => {
    const startKey = grid[0]?.dateKey ?? "2000-01-01";
    const endKey = grid[grid.length - 1]?.dateKey ?? "2000-01-01";
    return { startKey, endKey };
  }, [grid]);

  const { entries, loading, error } = useScheduleEntries(uid, range);
  const { companies } = useCompanies(uid);
  const { settings } = useUserSettings(uid);

  const companiesByName = useMemo(() => {
    const map = new Map<string, { colorKey?: string; colorHex?: string }>();
    for (const c of companies) {
      const key = (c.name ?? "").trim().toUpperCase();
      if (!key) continue;
      map.set(key, { colorKey: c.colorKey, colorHex: c.colorHex });
    }
    return map;
  }, [companies]);

  function colorStyleForInstitution(kind: InstitutionKind, name?: string) {
    const label = institutionLabel(kind, name).trim().toUpperCase();
    const c = companiesByName.get(label);
    const hex = c?.colorHex?.trim() ? c.colorHex.trim().toUpperCase() : "";
    if (hex && isValidHex(hex)) return { backgroundColor: hex } as const;
    return undefined;
  }

  function bgClassForInstitution(kind: InstitutionKind, name: string | undefined, fallbackIdx: number) {
    const label = institutionLabel(kind, name).trim().toUpperCase();
    const c = companiesByName.get(label);
    const k = c?.colorKey;
    if (k === "postit-yellow") return "bg-[color:var(--postit-yellow)]";
    if (k === "postit-blue") return "bg-[color:var(--postit-blue)]";
    if (k === "postit-green") return "bg-[color:var(--postit-green)]";
    if (k === "postit-purple") return "bg-[color:var(--postit-purple)]";
    if (k === "postit-pink") return "bg-[color:var(--postit-pink)]";
    return fallbackIdx % 4 === 0
      ? "bg-[color:var(--postit-yellow)]"
      : fallbackIdx % 4 === 1
        ? "bg-[color:var(--postit-blue)]"
        : fallbackIdx % 4 === 2
          ? "bg-[color:var(--postit-green)]"
          : "bg-[color:var(--postit-purple)]";
  }

  const entriesByDate = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>();
    for (const e of entries) {
      const list = map.get(e.dateKey) ?? [];
      list.push(e);
      map.set(e.dateKey, list);
    }
    return map;
  }, [entries]);

  const hoursByDateKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const [dateKey, list] of entriesByDate.entries()) {
      let total = 0;
      for (const e of list) {
        const minutes = Math.max(0, e.endMinutes - e.startMinutes);
        total += minutes / minutesPerHourUnit(e.institutionKind);
      }
      map.set(dateKey, round1(total));
    }
    return map;
  }, [entriesByDate]);

  const maxInMonthHours = useMemo(() => {
    let max = 0;
    for (const d of grid) {
      if (!d.inMonth) continue;
      const h = hoursByDateKey.get(d.dateKey) ?? 0;
      if (h > max) max = h;
    }
    return max;
  }, [grid, hoursByDateKey]);

  const selectedEntries = useMemo(
    () => entriesByDate.get(selectedDateKey) ?? [],
    [entriesByDate, selectedDateKey],
  );

  const selectedDate = useMemo(() => dateFromDateKey(selectedDateKey), [selectedDateKey]);

  const selectedEntriesSorted = useMemo(() => {
    return selectedEntries
      .filter((e) => !optimisticallyHiddenIds.has(e.id))
      .slice()
      .sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
      return a.name.localeCompare(b.name);
    });
  }, [optimisticallyHiddenIds, selectedEntries]);

  useEffect(() => {
    if (optimisticallyHiddenIds.size === 0) return;
    setOptimisticallyHiddenIds((prev) => {
      const next = new Set(prev);
      const currentIds = new Set(entries.map((e) => e.id));
      for (const id of prev) {
        if (!currentIds.has(id)) next.delete(id);
      }
      return next;
    });
  }, [entries, optimisticallyHiddenIds.size]);

  const totalsByInstitution = useMemo(() => {
    const map = new Map<
      string,
      { kind: InstitutionKind; institution: string; minutes: number }
    >();
    for (const e of selectedEntriesSorted) {
      const minutes = Math.max(0, e.endMinutes - e.startMinutes);
      const inst = institutionLabel(e.institutionKind, e.institutionName);
      const key = `${e.institutionKind}|${inst}`;
      map.set(key, {
        kind: e.institutionKind,
        institution: inst,
        minutes: (map.get(key)?.minutes ?? 0) + minutes,
      });
    }
    return [...map.values()].sort((a, b) => a.institution.localeCompare(b.institution));
  }, [selectedEntriesSorted]);

  const totalDayMinutes = useMemo(() => {
    let total = 0;
    for (const e of selectedEntriesSorted) total += Math.max(0, e.endMinutes - e.startMinutes);
    return total;
  }, [selectedEntriesSorted]);

  const groupedByInstitution = useMemo(() => {
    const map = new Map<
      string,
      {
        kind: InstitutionKind;
        institution: string;
        minutes: number;
        entries: ScheduleEntry[];
      }
    >();
    for (const e of selectedEntriesSorted) {
      const inst = institutionLabel(e.institutionKind, e.institutionName);
      const key = `${e.institutionKind}|${inst}`;
      const minutes = Math.max(0, e.endMinutes - e.startMinutes);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { kind: e.institutionKind, institution: inst, minutes, entries: [e] });
      } else {
        prev.minutes += minutes;
        prev.entries.push(e);
      }
    }
    return [...map.values()].sort((a, b) => a.institution.localeCompare(b.institution));
  }, [selectedEntriesSorted]);

  const [modalOpen, setModalOpen] = useState(false);
  const [addFromDayOpen, setAddFromDayOpen] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [deleteGroupTemplate, setDeleteGroupTemplate] = useState<ScheduleEntry | null>(null);
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function handleCreate(input: ScheduleEntryInput) {
    try {
      await createScheduleEntry(uid, input);
      toast.success({ title: "Listo", message: "Horario creado" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo crear el horario",
      });
      throw e;
    }
  }

  async function handleUpdate(input: ScheduleEntryInput) {
    if (!editing) return;
    try {
      await updateScheduleEntry(uid, editing.id, input);
      toast.success({ title: "Listo", message: "Horario actualizado" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo actualizar el horario",
      });
      throw e;
    }
  }

  async function handleDeleteSingle(entry: ScheduleEntry) {
    if (busyId) return;
    console.groupCollapsed("[horarios] delete click");
    console.log({ id: entry.id, dateKey: entry.dateKey, name: entry.name, startMinutes: entry.startMinutes, endMinutes: entry.endMinutes, room: entry.room, institutionKind: entry.institutionKind, institutionName: entry.institutionName });
    console.groupEnd();

    const ok = await confirm({
      title: "Eliminar horario",
      message: `¿Eliminar "${entry.name}" (${minutesToTime(entry.startMinutes)} - ${minutesToTime(entry.endMinutes)})?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(entry.id);
    setOptimisticallyHiddenIds((prev) => new Set([...prev, entry.id]));
    try {
      console.log("[horarios] deleting single...", { id: entry.id });
      await deleteScheduleEntry(uid, entry.id);
      console.log("[horarios] deleted single OK", { id: entry.id });
      toast.success({ title: "Listo", message: "Horario eliminado" });
    } catch (e) {
      console.error("[horarios] delete single ERROR", e);
      setOptimisticallyHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      toast.error({
        title: "Error",
        message:
          e instanceof Error
            ? e.message
            : "No se pudo eliminar el horario (revisa permisos de Firestore)",
      });
    } finally {
      setBusyId(null);
    }
  }

  function openDeleteGroup(entry: ScheduleEntry) {
    setDeleteGroupTemplate(entry);
    setDeleteGroupOpen(true);
  }

  async function handleDeleteFromSelectedDate() {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      const lastKey = await fetchLastScheduleDateKeyFrom(uid, selectedDateKey);
      if (!lastKey) {
        toast.info({ title: "Sin cambios", message: "No hay horarios para eliminar desde este día" });
        return;
      }

      const ok = await confirm({
        title: "Eliminar masivo",
        message: `¿Eliminar todos los horarios desde ${formatDateKeyLabel(selectedDateKey)} hasta ${formatDateKeyLabel(lastKey)}?`,
        okText: "Eliminar",
        cancelText: "Cancelar",
        variant: "danger",
      });
      if (!ok) return;

      setOptimisticallyHiddenIds((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          if (e.dateKey >= selectedDateKey) next.add(e.id);
        }
        return next;
      });

      const docs = await fetchScheduleEntriesFromDate(uid, selectedDateKey);
      const ids = docs.map((d) => d.id);
      if (ids.length === 0) {
        toast.info({ title: "Sin cambios", message: "No hay horarios para eliminar desde este día" });
        return;
      }

      const { deleted } = await deleteScheduleEntriesBulk(uid, ids);
      toast.success({ title: "Listo", message: `Eliminados: ${deleted}` });
    } catch (e) {
      console.error("[horarios] delete from selected date error", e);
      setOptimisticallyHiddenIds(() => new Set());
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo eliminar",
      });
    } finally {
      setBulkBusy(false);
    }
  }

  if (!mounted) return null;

  function endKeyForMonth(dateKey: string) {
    const parts = parseDateKey(dateKey);
    if (!parts) {
      return dateKeyFromParts(viewYear, viewMonth1Based, new Date(viewYear, viewMonth1Based, 0).getDate());
    }
    const last = new Date(parts.year, parts.month1Based, 0).getDate();
    return dateKeyFromParts(parts.year, parts.month1Based, last);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-blue)]">
            <CalendarDays className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Horarios
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              Registra clases y míralas en calendario.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            aria-label="Nuevo horario"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 shadow-sm sm:p-4 md:p-5">
        <div className={styles.calendarShell}>
          <Calendar
            className={styles.calendar}
            calendarType="iso8601"
            maxDetail="month"
            minDetail="month"
            next2Label={null}
            prev2Label={null}
            nextLabel={<ChevronRight className="mx-auto h-5 w-5" />}
            prevLabel={<ChevronLeft className="mx-auto h-5 w-5" />}
            activeStartDate={new Date(viewYear, viewMonth1Based - 1, 1)}
            value={selectedDate}
            showFixedNumberOfWeeks
            showNeighboringMonth
            formatMonthYear={(_locale, date) => monthLabel(date.getFullYear(), date.getMonth() + 1)}
            formatShortWeekday={(_locale, date) =>
              ["D", "L", "M", "X", "J", "V", "S"][date.getDay()] ?? ""
            }
            onActiveStartDateChange={({ activeStartDate, view }) => {
              if (view !== "month" || !activeStartDate) return;
              setViewYear(activeStartDate.getFullYear());
              setViewMonth1Based(activeStartDate.getMonth() + 1);
            }}
            onClickDay={(date) => {
              const dateKey = dateKeyFromParts(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
              );
              setSelectedDateKey(dateKey);
              setAddFromDayOpen(true);
            }}
            tileClassName={({ date, view }) => {
              if (view !== "month") return undefined;
              const inMonth =
                date.getFullYear() === viewYear && date.getMonth() + 1 === viewMonth1Based;
              const dateKey = dateKeyFromParts(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
              );
              return [
                !inMonth ? styles.tileOutside : "",
                (entriesByDate.get(dateKey)?.length ?? 0) > 0 ? styles.tileBusy : "",
              ]
                .filter(Boolean)
                .join(" ");
            }}
            tileContent={({ date, view }) => {
              if (view !== "month") return null;
              const dateKey = dateKeyFromParts(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
              );
              const count = entriesByDate.get(dateKey)?.length ?? 0;
              const hours = hoursByDateKey.get(dateKey) ?? 0;
              const ratio = maxInMonthHours > 0 ? Math.min(1, hours / maxInMonthHours) : 0;
              const dotSize = hours > 0 ? Math.round(4 + ratio * 8) : 0;
              const dotAlpha = hours > 0 ? 0.12 + ratio * 0.26 : 0;

              return (
                <>
                  {count ? <span className={styles.countBadge}>{count}</span> : null}
                  {hours ? <span className={styles.hoursChip}>{formatCompactHours(hours)}</span> : null}
                  {dotSize ? (
                    <span
                      className={styles.heatDot}
                      style={{
                        width: `${dotSize}px`,
                        height: `${dotSize}px`,
                        backgroundColor: primaryHeatColor(dotAlpha),
                      }}
                    />
                  ) : null}
                </>
              );
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {formatDateKeyLabel(selectedDateKey)}
            </div>
            <div className="text-xs text-[color:var(--color-muted)]">
              {loading ? "Cargando..." : `${selectedEntries.length} clases`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDeleteFromSelectedDate()}
              disabled={loading || bulkBusy}
              aria-label="Eliminar desde aquí"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] text-[color:var(--color-foreground)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              aria-label="Agregar aquí"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {selectedEntriesSorted.length ? (
          <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-semibold text-[color:var(--color-muted)]">
                TOTAL DEL DÍA
              </div>
              <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                {formatDurationMinutes(totalDayMinutes)}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {totalsByInstitution.map((t) => (
                <div
                  key={t.institution}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                      {t.institution}
                    </div>
                    <div className="text-xs text-[color:var(--color-muted)]">
                      {formatDurationMinutes(t.minutes)} · {minutesPerHourUnit(t.kind)} MIN/H
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-extrabold text-[color:var(--color-foreground)]">
                    {formatHoursForInstitution(t.minutes, t.kind)} H
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && selectedEntries.length === 0 ? (
          <div className="mt-4 text-sm text-[color:var(--color-muted)]">
            No hay clases en este día.
          </div>
        ) : null}

        {selectedEntriesSorted.length ? (
          <div className="mt-4">
            <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Horario del día
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedEntriesSorted.map((e, idx) => {
                const style = colorStyleForInstitution(e.institutionKind, e.institutionName);
                const bg = bgClassForInstitution(e.institutionKind, e.institutionName, idx);

                return (
                  <div
                    key={e.id}
                    style={style}
                    className={[
                      "rounded-3xl border border-[color:var(--color-border)] p-4 shadow-sm",
                      bg,
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
                          {e.name}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
                          {institutionLabel(e.institutionKind, e.institutionName)}
                          {e.room ? ` · ${e.room}` : ""}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                          {minutesToTime(e.startMinutes)} - {minutesToTime(e.endMinutes)}
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
                          onClick={() => openDeleteGroup(e)}
                          disabled={busyId === e.id}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 text-[color:var(--color-foreground)] transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
                          aria-label="Eliminar grupo"
                          title="Eliminar grupo periódico"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSingle(e)}
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
          </div>
        ) : null}

        {groupedByInstitution.length ? (
          <div className="mt-6">
            <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Por institución
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {groupedByInstitution.map((g, idx) => {
                const style = (() => {
                  const c = companiesByName.get(g.institution.trim().toUpperCase());
                  const hex = c?.colorHex?.trim() ? c.colorHex.trim().toUpperCase() : "";
                  if (hex && isValidHex(hex)) return { backgroundColor: hex } as const;
                  return undefined;
                })();
                const bg = (() => {
                  const c = companiesByName.get(g.institution.trim().toUpperCase());
                  const k = c?.colorKey;
                  if (k === "postit-yellow") return "bg-[color:var(--postit-yellow)]";
                  if (k === "postit-blue") return "bg-[color:var(--postit-blue)]";
                  if (k === "postit-green") return "bg-[color:var(--postit-green)]";
                  if (k === "postit-purple") return "bg-[color:var(--postit-purple)]";
                  if (k === "postit-pink") return "bg-[color:var(--postit-pink)]";
                  return idx % 3 === 0
                    ? "bg-[color:var(--postit-blue)]"
                    : idx % 3 === 1
                      ? "bg-[color:var(--postit-yellow)]"
                      : "bg-[color:var(--postit-green)]";
                })();

                return (
                  <div
                    key={g.institution}
                    style={style}
                    className={[
                      "rounded-3xl border border-[color:var(--color-border)] p-4 shadow-sm",
                      bg,
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
                          {g.institution}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
                          {formatDurationMinutes(g.minutes)} · {minutesPerHourUnit(g.kind)} MIN/H
                        </div>
                      </div>
                      <div className="shrink-0 text-base font-extrabold text-[color:var(--color-foreground)]">
                        {formatHoursForInstitution(g.minutes, g.kind)} H
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {g.entries.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                                {e.name}
                              </div>
                              <div className="text-xs text-[color:var(--color-muted)]">
                                {minutesToTime(e.startMinutes)} - {minutesToTime(e.endMinutes)}
                                {e.room ? ` · ${e.room}` : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

      </div>

      <ScheduleFormModal
        open={modalOpen}
        title={editing ? "Editar horario" : "Nuevo horario"}
        defaultDateKey={selectedDateKey}
        defaultInstitutionKind={settings.schedules.defaultInstitutionKind}
        defaultOtherInstitutionName={settings.schedules.defaultOtherInstitutionName}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      <AddScheduleFromDayModal
        open={addFromDayOpen}
        uid={uid}
        dateKey={selectedDateKey}
        defaultBulkEndKey={endKeyForMonth(selectedDateKey)}
        defaultInstitutionKind={settings.schedules.defaultInstitutionKind}
        defaultOtherInstitutionName={settings.schedules.defaultOtherInstitutionName}
        onClose={() => setAddFromDayOpen(false)}
      />

      <DeleteGroupModal
        open={deleteGroupOpen}
        uid={uid}
        template={deleteGroupTemplate}
        onClose={() => {
          setDeleteGroupOpen(false);
          setDeleteGroupTemplate(null);
        }}
      />
    </div>
  );
}
