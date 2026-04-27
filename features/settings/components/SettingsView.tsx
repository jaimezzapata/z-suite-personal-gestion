"use client";

import {
  Download,
  LogOut,
  Save,
  Settings as SettingsIcon,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { signOutCurrentUser } from "@/features/auth/services/authService";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useExpenses } from "@/features/expenses/hooks/useExpenses";
import { usePayslips } from "@/features/payslips/hooks/usePayslips";
import { fetchScheduleEntriesFromDate } from "@/features/schedules/services/schedulesService";
import type { UserSettings } from "@/features/settings/types";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { useCurrentUser } from "@/shared/auth/CurrentUserContext";
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
          {label}
        </div>
        {description ? (
          <div className="mt-1 text-xs text-[color:var(--color-muted)]">
            {description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={label}
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={[
          "relative h-9 w-16 rounded-full border border-[color:var(--color-border)] transition-colors",
          value ? "bg-[color:var(--color-primary)]" : "bg-[color:var(--color-surface-2)]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out",
            value ? "left-8" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export function SettingsView() {
  const user = useCurrentUser();
  const { settings, loading: settingsLoading, error: settingsError, update } = useUserSettings(user.uid);

  const { companies } = useCompanies(user.uid);
  const { payslips } = usePayslips(user.uid);
  const { expenses } = useExpenses(user.uid);

  const [busy, setBusy] = useState<null | "export" | "import" | "logout">(null);
  const [scheduleCount, setScheduleCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const safeName = (user.name ?? "").trim() || "—";
  const safeEmail = (user.email ?? "").trim() || "—";

  const exportFilename = useMemo(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    return `z-suite_export_${stamp}.json`;
  }, []);

  async function handleLogout() {
    if (busy) return;
    const ok = await confirm({
      title: "Cerrar sesión",
      message: "¿Cerrar sesión ahora?",
      okText: "Sí",
      cancelText: "No",
      variant: "danger",
    });
    if (!ok) return;
    setBusy("logout");
    try {
      await signOutCurrentUser();
      toast.success({ title: "Listo", message: "Sesión cerrada" });
    } catch (e) {
      toast.error({ title: "Error", message: e instanceof Error ? e.message : "No se pudo cerrar sesión" });
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    if (busy) return;
    setBusy("export");
    try {
      const schedulesRaw = await fetchScheduleEntriesFromDate(user.uid, "0000-01-01");
      const schedules = schedulesRaw.map((d) => ({ id: d.id, ...d.data }));
      setScheduleCount(schedules.length);

      const payload = {
        exportedAt: new Date().toISOString(),
        user: { uid: user.uid, name: user.name ?? null, email: user.email ?? null },
        settings,
        companies,
        payslips,
        expenses,
        schedules,
      };

      downloadJson(exportFilename, payload);
      toast.success({ title: "Listo", message: "Exportación descargada" });
    } catch (e) {
      toast.error({ title: "Error", message: e instanceof Error ? e.message : "No se pudo exportar" });
    } finally {
      setBusy(null);
    }
  }

  async function handleImportFile(file: File) {
    if (busy) return;
    setBusy("import");
    try {
      const text = await file.text();
      const json = JSON.parse(text) as any;
      const nextSettings: Partial<UserSettings> | null =
        json && typeof json === "object" && json.settings && typeof json.settings === "object"
          ? (json.settings as Partial<UserSettings>)
          : null;

      if (!nextSettings) {
        toast.error({ title: "Archivo inválido", message: "No encontré 'settings' dentro del JSON" });
        return;
      }

      const ok = await confirm({
        title: "Importar ajustes",
        message: "Esto reemplaza tus ajustes actuales (no toca tus datos). ¿Continuar?",
        okText: "Sí",
        cancelText: "No",
        variant: "danger",
      });
      if (!ok) return;

      await update(nextSettings);
      toast.success({ title: "Listo", message: "Ajustes importados" });
    } catch (e) {
      toast.error({ title: "Error", message: e instanceof Error ? e.message : "No se pudo importar" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-blue)]">
          <SettingsIcon className="h-5 w-5 text-[color:var(--color-foreground)]" />
        </span>
        <div>
          <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
            Ajustes
          </div>
          <div className="text-sm text-[color:var(--color-muted)]">
            Cuenta, preferencias y exportación.
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)]">
              <UserIcon className="h-5 w-5 text-[color:var(--color-foreground)]" />
            </span>
            <div>
              <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Cuenta</div>
              <div className="text-xs text-[color:var(--color-muted)]">{safeEmail}</div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={() => void handleLogout()}
            disabled={busy !== null}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] text-[color:var(--color-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
              Nombre
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[color:var(--color-foreground)]">
              {safeName}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
              UID
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-[color:var(--color-foreground)]">
              {user.uid}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Preferencias</div>
            <div className="text-xs text-[color:var(--color-muted)]">Se guardan en tu cuenta.</div>
          </div>
          {settingsLoading ? (
            <div className="text-xs font-semibold text-[color:var(--color-muted)]">Cargando…</div>
          ) : null}
        </div>

        {settingsError ? (
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
            {settingsError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Toggle
            label="Dashboard: recordar mes"
            description="Mantiene el mes/año seleccionados al volver a entrar."
            value={settings.dashboard.rememberPeriod}
            onChange={(v) => void update({ dashboard: { ...settings.dashboard, rememberPeriod: v } })}
          />
          <Toggle
            label="Dashboard: ahorro histórico"
            description="Muestra el saldo total (colillas históricas − gastos históricos)."
            value={settings.dashboard.showSavingsAll}
            onChange={(v) => void update({ dashboard: { ...settings.dashboard, showSavingsAll: v } })}
          />

          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
            <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
              Horarios: institución por defecto
            </div>
            <div className="mt-1 text-xs text-[color:var(--color-muted)]">
              Se aplica al abrir el formulario de nuevo horario.
            </div>

            <select
              value={settings.schedules.defaultInstitutionKind}
              onChange={(e) => {
                const v = e.target.value;
                const kind = v === "SENA" || v === "OTRA" ? v : "CESDE";
                void update({ schedules: { ...settings.schedules, defaultInstitutionKind: kind } });
              }}
              className="mt-3 h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
            >
              <option value="CESDE">CESDE</option>
              <option value="SENA">SENA</option>
              <option value="OTRA">OTRA</option>
            </select>

            {settings.schedules.defaultInstitutionKind === "OTRA" ? (
              <input
                value={settings.schedules.defaultOtherInstitutionName}
                onChange={(e) =>
                  void update({
                    schedules: { ...settings.schedules, defaultOtherInstitutionName: e.target.value },
                  })
                }
                placeholder="Nombre por defecto (OTRA)"
                className="mt-2 h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            ) : null}
          </div>

          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
            <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">
              Guardar ajustes
            </div>
            <div className="mt-1 text-xs text-[color:var(--color-muted)]">
              Los cambios se guardan automáticamente.
            </div>
            <div className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-[color:var(--color-muted)]">
              <Save className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Datos</div>
            <div className="text-xs text-[color:var(--color-muted)]">
              Exporta toda tu información o importa ajustes.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-label="Exportar datos"
            onClick={() => void handleExport()}
            disabled={busy !== null}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Importar ajustes"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void handleImportFile(file);
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Empresas", value: companies.length },
            { label: "Colillas", value: payslips.length },
            { label: "Gastos", value: expenses.length },
          ].map((it) => (
            <div
              key={it.label}
              className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2"
            >
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
                {it.label}
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {it.value}
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[color:var(--color-muted)]">
              Horarios
            </div>
            <div className="mt-0.5 text-sm font-extrabold text-[color:var(--color-foreground)]">
              {scheduleCount == null ? "—" : scheduleCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
