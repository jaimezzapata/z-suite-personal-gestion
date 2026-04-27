"use client";

import type { LucideIcon } from "lucide-react";
import { Building2, School, Save, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  InstitutionKind,
  ScheduleEntry,
  ScheduleEntryInput,
} from "@/features/schedules/types";
import { parseDateKey } from "@/features/schedules/utils/dateKey";
import { minutesToTime, timeToMinutes } from "@/features/schedules/utils/time";
import { toast } from "@/shared/ui/toast";

const INSTITUTIONS: Array<{
  kind: InstitutionKind;
  label: string;
  Icon: LucideIcon;
  bgClass: string;
}> = [
  {
    kind: "CESDE",
    label: "CESDE",
    Icon: School,
    bgClass: "bg-[color:var(--postit-yellow)]",
  },
  {
    kind: "SENA",
    label: "SENA",
    Icon: Building2,
    bgClass: "bg-[color:var(--postit-green)]",
  },
  {
    kind: "OTRA",
    label: "OTRA",
    Icon: Building2,
    bgClass: "bg-[color:var(--postit-blue)]",
  },
];

type Props = {
  open: boolean;
  title: string;
  defaultDateKey: string;
  initial?: ScheduleEntry | null;
  onClose: () => void;
  onSubmit: (input: ScheduleEntryInput) => Promise<void>;
};

export function ScheduleFormModal({
  open,
  title,
  defaultDateKey,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [dateKey, setDateKey] = useState<string>(defaultDateKey);
  const [institutionKind, setInstitutionKind] = useState<InstitutionKind>("CESDE");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("07:00");
  const [endTime, setEndTime] = useState<string>("08:00");
  const [room, setRoom] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!parseDateKey(dateKey)) return false;
    if (!name.trim()) return false;
    if (institutionKind === "OTRA" && !institutionName.trim()) return false;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes == null || endMinutes == null) return false;
    if (endMinutes <= startMinutes) return false;
    return true;
  }, [dateKey, endTime, institutionKind, institutionName, name, startTime]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDateKey(initial.dateKey);
      setInstitutionKind(initial.institutionKind);
      setInstitutionName(initial.institutionName ?? "");
      setName(initial.name ?? "");
      setStartTime(minutesToTime(initial.startMinutes));
      setEndTime(minutesToTime(initial.endMinutes));
      setRoom(initial.room ?? "");
    } else {
      setDateKey(defaultDateKey);
      setInstitutionKind("CESDE");
      setInstitutionName("");
      setName("");
      setStartTime("07:00");
      setEndTime("08:00");
      setRoom("");
    }
    setLoading(false);
  }, [defaultDateKey, initial, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      if (startMinutes == null || endMinutes == null) return;
      if (endMinutes <= startMinutes) return;

      const input: ScheduleEntryInput = {
        dateKey,
        institutionKind,
        institutionName: institutionKind === "OTRA" ? institutionName.trim() : undefined,
        name: name.trim(),
        startMinutes,
        endMinutes,
        room: room.trim() ? room.trim() : undefined,
      };
      await onSubmit(input);
      onClose();
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo guardar el horario",
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
        <div className="w-full max-w-md animate-[fade-in-up_220ms_ease-out] rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                {title}
              </div>
              <div className="text-sm text-[color:var(--color-muted)]">
                Institución, clase, horas y ambiente.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Fecha
              </label>
              <input
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                type="date"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>

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

            <div className="flex items-center justify-end gap-2 pt-1">
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
