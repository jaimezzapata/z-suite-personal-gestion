"use client";

import { Building2, Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useCompanies } from "@/features/companies/hooks/useCompanies";
import type { Company, CompanyInput } from "@/features/companies/types";
import {
  createCompany,
  deleteCompany,
  setCompanyActive,
  updateCompanyWithSalaryHistory,
} from "@/features/companies/services/companiesService";
import { payFrequencyLabel, payTypeLabel } from "@/features/companies/utils/labels";
import { confirm } from "@/shared/ui/confirm";
import { toast } from "@/shared/ui/toast";
import { isValidHex, normalizeHex } from "@/shared/utils/color";
import { formatDateWithWeekday, formatMoney } from "@/shared/utils/format";

import { CompanyFormModal } from "./CompanyFormModal";

type Props = {
  uid: string;
};

export function CompaniesView({ uid }: Props) {
  const { companies, loading, error } = useCompanies(uid);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const empty = useMemo(() => !loading && companies.length === 0, [loading, companies.length]);

  async function handleCreate(input: CompanyInput) {
    try {
      await createCompany(uid, input);
      toast.success({ title: "Listo", message: "Empresa creada" });
    } catch (e) {
      toast.error({
        title: "Error",
        message: e instanceof Error ? e.message : "No se pudo crear la empresa",
      });
      throw e;
    }
  }

  async function handleUpdate(input: CompanyInput) {
    if (!editing) return;
    try {
      await updateCompanyWithSalaryHistory(uid, editing.id, input, {
        payType: editing.payType,
        hourlyRate: editing.hourlyRate,
        fixedSalary: editing.fixedSalary,
        currency: editing.currency,
      });
      toast.success({ title: "Listo", message: "Empresa actualizada" });
    } catch (e) {
      toast.error({
        title: "Error",
        message:
          e instanceof Error ? e.message : "No se pudo actualizar la empresa",
      });
      throw e;
    }
  }

  async function handleDelete(company: Company) {
    if (busyId) return;
    const ok = await confirm({
      title: "Eliminar empresa",
      message: `¿Eliminar "${company.name}"? Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(company.id);
    try {
      await deleteCompany(uid, company.id);
      toast.success({ title: "Listo", message: "Empresa eliminada" });
    } catch (e) {
      toast.error({
        title: "Error",
        message:
          e instanceof Error ? e.message : "No se pudo eliminar la empresa",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(company: Company) {
    if (busyId) return;
    setBusyId(company.id);
    try {
      await setCompanyActive(uid, company.id, !company.active);
      toast.success({
        title: "Listo",
        message: !company.active ? "Empresa activada" : "Empresa desactivada",
      });
    } catch (e) {
      toast.error({
        title: "Error",
        message:
          e instanceof Error ? e.message : "No se pudo actualizar el estado",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)]">
            <Building2 className="h-5 w-5 text-[color:var(--color-foreground)]" />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Empresas
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              Administra dónde trabajas y cómo te pagan.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          aria-label="Nueva empresa"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-pink)] p-4 text-sm text-[color:var(--color-foreground)]">
          {error}
        </div>
      ) : null}

      {empty ? (
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Aún no tienes empresas
          </div>
          <div className="mt-1 text-sm text-[color:var(--color-muted)]">
            Crea tu primera empresa para empezar a registrar colillas, horarios y
            horas.
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {companies.map((c, idx) => {
          const hex = c.colorHex?.trim() ? normalizeHex(c.colorHex) : "";
          const style = hex && isValidHex(hex) ? ({ backgroundColor: hex } as const) : undefined;
          const bg =
            c.colorKey === "postit-yellow"
              ? "bg-[color:var(--postit-yellow)]"
              : c.colorKey === "postit-blue"
                ? "bg-[color:var(--postit-blue)]"
                : c.colorKey === "postit-green"
                  ? "bg-[color:var(--postit-green)]"
                  : c.colorKey === "postit-purple"
                    ? "bg-[color:var(--postit-purple)]"
                    : c.colorKey === "postit-pink"
                      ? "bg-[color:var(--postit-pink)]"
                      : idx % 4 === 0
                        ? "bg-[color:var(--postit-yellow)]"
                        : idx % 4 === 1
                          ? "bg-[color:var(--postit-blue)]"
                          : idx % 4 === 2
                            ? "bg-[color:var(--postit-green)]"
                            : "bg-[color:var(--postit-purple)]";

          const titleClass = "text-white";
          const mutedClass = "text-white/85";
          const badgeClass = "border-white/35 bg-white/20 text-white";
          const iconButtonClass =
            "border-white/35 bg-white/90 text-[color:var(--color-foreground)]";

          return (
            <div
              key={c.id}
              style={style}
              className={[
                "rounded-3xl border border-[color:var(--color-border)] p-4 shadow-sm",
                bg,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={["truncate text-base font-semibold", titleClass].join(" ")}>
                    {c.name}
                  </div>
                  <div className={["mt-1 flex flex-wrap items-center gap-2 text-sm", mutedClass].join(" ")}>
                    <span>
                      {payTypeLabel(c.payType)} · {payFrequencyLabel(c.payFrequency)}
                    </span>
                    <span className={["rounded-full border px-2 py-0.5 text-xs font-semibold", badgeClass].join(" ")}>
                      {c.active ? "ACTIVA" : "INACTIVA"}
                    </span>
                  </div>
                  {c.payType === "hourly" && typeof c.hourlyRate === "number" ? (
                    <div className={["mt-2 text-sm font-semibold", titleClass].join(" ")}>
                      {formatMoney(c.hourlyRate, c.currency)} / hora
                    </div>
                  ) : c.payType === "fixed" &&
                    typeof c.fixedSalary === "number" ? (
                    <div className={["mt-2 text-sm font-semibold", titleClass].join(" ")}>
                      {formatMoney(c.fixedSalary, c.currency)}
                    </div>
                  ) : null}

                  {c.contractStartDate ? (
                    <div className={["mt-2 text-xs", mutedClass].join(" ")}>
                      INICIO: {formatDateWithWeekday(c.contractStartDate.toDate())}
                      {c.contractEndDate ? (
                        <> · FIN: {formatDateWithWeekday(c.contractEndDate.toDate())}</>
                      ) : null}
                    </div>
                  ) : null}

                  {c.notes ? (
                    <div className={["mt-2 max-h-10 overflow-hidden text-xs", mutedClass].join(" ")}>
                      {c.notes}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(c)}
                    disabled={busyId === c.id}
                    className={[
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60",
                      iconButtonClass,
                    ].join(" ")}
                    aria-label={c.active ? "Desactivar" : "Activar"}
                    title={c.active ? "Desactivar" : "Activar"}
                  >
                    {c.active ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(c);
                      setModalOpen(true);
                    }}
                    className={[
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                      iconButtonClass,
                    ].join(" ")}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    disabled={busyId === c.id}
                    className={[
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60",
                      iconButtonClass,
                    ].join(" ")}
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

      <CompanyFormModal
        open={modalOpen}
        title={editing ? "Editar empresa" : "Nueva empresa"}
        uid={uid}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={editing ? handleUpdate : handleCreate}
      />
    </div>
  );
}
