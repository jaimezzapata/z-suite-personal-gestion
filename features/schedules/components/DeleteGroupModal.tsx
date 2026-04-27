"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ScheduleEntry } from "@/features/schedules/types";
import {
  deleteScheduleEntriesBulk,
  fetchScheduleEntriesFromDate,
} from "@/features/schedules/services/schedulesService";
import { minutesToTime } from "@/features/schedules/utils/time";
import { toast } from "@/shared/ui/toast";

function signatureFromEntry(e: ScheduleEntry) {
  const instName = e.institutionKind === "OTRA" ? (e.institutionName ?? "").trim().toUpperCase() : "";
  const room = (e.room ?? "").trim().toUpperCase();
  return [
    e.institutionKind,
    instName,
    (e.name ?? "").trim().toUpperCase(),
    e.startMinutes,
    e.endMinutes,
    room,
  ].join("|");
}

function signatureFromDoc(data: any) {
  const institutionKind =
    data.institutionKind === "CESDE" ||
    data.institutionKind === "SENA" ||
    data.institutionKind === "OTRA"
      ? data.institutionKind
      : "OTRA";
  const instName =
    institutionKind === "OTRA" && typeof data.institutionName === "string"
      ? data.institutionName.trim().toUpperCase()
      : "";
  const name = typeof data.name === "string" ? data.name.trim().toUpperCase() : "";
  const startMinutes = typeof data.startMinutes === "number" ? data.startMinutes : 0;
  const endMinutes = typeof data.endMinutes === "number" ? data.endMinutes : 0;
  const room = typeof data.room === "string" ? data.room.trim().toUpperCase() : "";
  return [institutionKind, instName, name, startMinutes, endMinutes, room].join("|");
}

type Props = {
  open: boolean;
  uid: string;
  template: ScheduleEntry | null;
  onClose: () => void;
};

export function DeleteGroupModal({ open, uid, template, onClose }: Props) {
  const [toDeleteIds, setToDeleteIds] = useState<string[]>([]);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !template) return;
    setToDeleteIds([]);
    setLastKey(null);
    setLoading(true);

    void (async () => {
      try {
        const docs = await fetchScheduleEntriesFromDate(uid, template.dateKey);
        const targetSig = signatureFromEntry(template);
        const ids: string[] = [];
        let last: string | null = null;

        for (const d of docs) {
          const dateKey = typeof d.data.dateKey === "string" ? d.data.dateKey : "";
          if (!dateKey) continue;
          if (signatureFromDoc(d.data) !== targetSig) continue;
          ids.push(d.id);
          if (!last || dateKey > last) last = dateKey;
        }

        setToDeleteIds(ids);
        setLastKey(last);
      } catch (e) {
        console.error("[horarios] delete group preview error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, template, uid]);

  const canSubmit = useMemo(() => {
    if (!template) return false;
    if (loading) return false;
    return toDeleteIds.length > 0;
  }, [loading, template, toDeleteIds.length]);

  async function handleDeleteGroup() {
    if (!template) return;
    if (!canSubmit) return;
    if (loading) return;

    setLoading(true);
    try {
      console.groupCollapsed("[horarios] delete group periodic");
      console.log({
        template: {
          dateKey: template.dateKey,
          name: template.name,
          startMinutes: template.startMinutes,
          endMinutes: template.endMinutes,
          room: template.room,
          institutionKind: template.institutionKind,
          institutionName: template.institutionName,
        },
        from: template.dateKey,
      });
      console.groupEnd();

      const { deleted } = await deleteScheduleEntriesBulk(uid, toDeleteIds);
      toast.success({ title: "Listo", message: `Eliminados: ${deleted}` });
      onClose();
    } catch (e) {
      console.error("[horarios] delete group error", e);
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo eliminar el grupo",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!open || !template) return null;

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
                  Eliminar grupo periódico
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  {template.name} · {minutesToTime(template.startMinutes)} - {minutesToTime(template.endMinutes)}
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
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-3 text-sm font-semibold text-[color:var(--color-foreground)]">
              Eliminará automáticamente todas las ocurrencias desde este día hasta lo último programado. Esta acción no se puede deshacer.
            </div>

            <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-xs font-semibold text-[color:var(--color-muted)]">RESUMEN</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
                  <div className="text-xs text-[color:var(--color-muted)]">Desde</div>
                  <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {template.dateKey}
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
                  <div className="text-xs text-[color:var(--color-muted)]">Hasta</div>
                  <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {lastKey ?? "-"}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
                <div className="text-xs text-[color:var(--color-muted)]">Se eliminarán</div>
                <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
                  {loading ? "Calculando..." : `${toDeleteIds.length} horarios`}
                </div>
              </div>
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
                type="button"
                onClick={() => void handleDeleteGroup()}
                disabled={loading || !canSubmit}
                aria-label="Eliminar grupo"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-danger)] text-white shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
