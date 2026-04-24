"use client";

import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function HomePage() {
  return (
    <ProtectedPage title="Dashboard">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Ingresos
          </div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--color-foreground)]">
            —
          </div>
        </div>
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Gastos
          </div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--color-foreground)]">
            —
          </div>
        </div>
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Disponible (Ahorro)
          </div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--color-foreground)]">
            —
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
