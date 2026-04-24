"use client";

import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function AjustesPage() {
  return (
    <ProtectedPage title="Ajustes">
      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
        Próximamente: configuración de periodos, tolerancias y preferencias.
      </div>
    </ProtectedPage>
  );
}

