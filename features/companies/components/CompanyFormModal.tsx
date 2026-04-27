"use client";

import { Building2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  Company,
  CompanyColorKey,
  CompanyInput,
  PayFrequency,
  PayType,
} from "@/features/companies/types";
import { useCompanySalaryHistory } from "@/features/companies/hooks/useCompanySalaryHistory";
import { parseISODateInput, timestampToISODateInput } from "@/shared/utils/date";
import { isValidHex, normalizeHex } from "@/shared/utils/color";
import { normalizeUpper } from "@/shared/utils/text";
import { formatDateWithWeekday, formatMoney } from "@/shared/utils/format";
import { toast } from "@/shared/ui/toast";

type Props = {
  open: boolean;
  title: string;
  uid?: string;
  initial?: Company | null;
  onClose: () => void;
  onSubmit: (input: CompanyInput) => Promise<void>;
};

export function CompanyFormModal({
  open,
  title,
  uid,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [payType, setPayType] = useState<PayType>("fixed");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("biweekly");
  const [currency, setCurrency] = useState<CompanyInput["currency"]>("COP");
  const [colorKey, setColorKey] = useState<CompanyColorKey>("postit-yellow");
  const [colorHex, setColorHex] = useState("");
  const [active, setActive] = useState(true);
  const [contractStartDate, setContractStartDate] = useState<string>("");
  const [contractEndDate, setContractEndDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [fixedSalary, setFixedSalary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { items: salaryHistory } = useCompanySalaryHistory(
    uid,
    initial?.id,
    6,
  );

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (payType === "hourly") {
      const n = Number(hourlyRate);
      return Number.isFinite(n) && n > 0;
    }
    const s = Number(fixedSalary);
    return Number.isFinite(s) && s > 0;
  }, [name, payType, hourlyRate, fixedSalary]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name ?? "");
      setPayType(initial.payType);
      setPayFrequency(initial.payFrequency);
      setCurrency(initial.currency ?? "COP");
      setColorKey(initial.colorKey ?? "postit-yellow");
      setColorHex(initial.colorHex ?? "");
      setActive(initial.active ?? true);
      setContractStartDate(
        initial.contractStartDate ? timestampToISODateInput(initial.contractStartDate) : "",
      );
      setContractEndDate(
        initial.contractEndDate ? timestampToISODateInput(initial.contractEndDate) : "",
      );
      setNotes(initial.notes ?? "");
      setHourlyRate(
        initial.payType === "hourly" && typeof initial.hourlyRate === "number"
          ? String(initial.hourlyRate)
          : "",
      );
      setFixedSalary(
        initial.payType === "fixed" && typeof initial.fixedSalary === "number"
          ? String(initial.fixedSalary)
          : "",
      );
    } else {
      setName("");
      setPayType("fixed");
      setPayFrequency("biweekly");
      setCurrency("COP");
      setColorKey("postit-yellow");
      setColorHex("");
      setActive(true);
      setContractStartDate("");
      setContractEndDate("");
      setNotes("");
      setHourlyRate("");
      setFixedSalary("");
    }
    setLoading(false);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    if (contractEndDate.trim()) {
      setActive(false);
    }
  }, [contractEndDate, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const normalizedHex = normalizeHex(colorHex);
      if (normalizedHex && !isValidHex(normalizedHex)) {
        toast.error({ title: "Color inválido", message: "Usa formato #RGB o #RRGGBB" });
        return;
      }
      const startDate = parseISODateInput(contractStartDate);
      const endDate = contractEndDate ? parseISODateInput(contractEndDate) : undefined;

      const input: CompanyInput = {
        name: normalizeUpper(name),
        payType,
        payFrequency,
        currency,
        colorKey,
        colorHex: normalizedHex ? normalizedHex : undefined,
        active,
        contractStartDate: startDate,
        contractEndDate: endDate ?? null,
        notes: notes ? normalizeUpper(notes) : undefined,
        hourlyRate:
          payType === "hourly" ? Number(hourlyRate) : undefined,
        fixedSalary: payType === "fixed" ? Number(fixedSalary) : undefined,
      };
      await onSubmit(input);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="flex w-full max-w-md max-h-[calc(100dvh-2rem)] animate-[fade-in-up_220ms_ease-out] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--postit-yellow)]">
                <Building2 className="h-5 w-5 text-[color:var(--color-foreground)]" />
              </span>
              <div>
                <div className="text-lg font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  {title}
                </div>
                <div className="text-sm text-[color:var(--color-muted)]">
                  Configura cómo te paga esta empresa.
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
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
              <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Nombre
              </label>
              <input
                value={name}
                onChange={(e) => setName(normalizeUpper(e.target.value))}
                autoFocus
                placeholder="Ej. CESDE"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    "postit-yellow",
                    "postit-blue",
                    "postit-green",
                    "postit-purple",
                    "postit-pink",
                  ] as CompanyColorKey[]
                ).map((k) => {
                  const selected = colorKey === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setColorKey(k);
                        setColorHex("");
                      }}
                      aria-pressed={selected}
                      className={[
                        "h-11 rounded-2xl border transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
                        selected
                          ? "border-[color:var(--color-primary)] ring-4 ring-[color:var(--primary-ring)]"
                          : "border-[color:var(--color-border)]",
                        k === "postit-yellow"
                          ? "bg-[color:var(--postit-yellow)]"
                          : k === "postit-blue"
                            ? "bg-[color:var(--postit-blue)]"
                            : k === "postit-green"
                              ? "bg-[color:var(--postit-green)]"
                              : k === "postit-purple"
                                ? "bg-[color:var(--postit-purple)]"
                                : "bg-[color:var(--postit-pink)]",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-11 w-11 rounded-2xl border border-[color:var(--color-border)]"
                  style={{
                    backgroundColor: isValidHex(normalizeHex(colorHex))
                      ? normalizeHex(colorHex)
                      : undefined,
                  }}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-xs font-semibold text-[color:var(--color-muted)]">
                    Hex (opcional)
                  </label>
                  <input
                    value={colorHex}
                    onChange={(e) => setColorHex(normalizeHex(e.target.value))}
                    placeholder="#AABBCC"
                    className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Tipo de pago
                </label>
                <select
                  value={payType}
                  onChange={(e) =>
                    setPayType(e.target.value === "hourly" ? "hourly" : "fixed")
                  }
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                >
                  <option value="fixed">Fijo</option>
                  <option value="hourly">Por hora</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Frecuencia
                </label>
                <select
                  value={payFrequency}
                  onChange={(e) =>
                    setPayFrequency(
                      e.target.value === "monthly" ? "monthly" : "biweekly",
                    )
                  }
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                >
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value === "USD" ? "USD" : "COP")
                  }
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                >
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Estado
                </label>
                <select
                  value={active ? "active" : "inactive"}
                  onChange={(e) => setActive(e.target.value === "active")}
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Inicio de contrato
                </label>
                <input
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                  type="date"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Fin de contrato (opcional)
                </label>
                <input
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  type="date"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
            </div>

            {payType === "hourly" ? (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Valor hora ({currency})
                </label>
                <input
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 35000"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                  Salario fijo ({currency})
                </label>
                <input
                  value={fixedSalary}
                  onChange={(e) => setFixedSalary(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 2500000"
                  className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(normalizeUpper(e.target.value))}
                rows={3}
                placeholder="EJ. CONTRATO 2026"
                className="w-full resize-none rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>

            {initial && salaryHistory.length ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  Historial salarial
                </div>
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3">
                  <div className="space-y-2">
                    {salaryHistory.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--color-surface)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                            {h.kind === "hourly"
                              ? `${formatMoney(h.value, h.currency)} / hora`
                              : formatMoney(h.value, h.currency)}
                          </div>
                          <div className="truncate text-xs text-[color:var(--color-muted)]">
                            {h.createdAt
                              ? formatDateWithWeekday(h.createdAt.toDate())
                              : "—"}
                          </div>
                        </div>
                        <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--postit-blue)] px-2 py-0.5 text-xs font-semibold text-[color:var(--color-foreground)]">
                          {h.kind === "hourly" ? "POR HORA" : "FIJO"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
