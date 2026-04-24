"use client";

import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function HorasPage() {
  return (
    <ProtectedPage title="Horas">
      <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--postit-green)] p-4 text-sm text-[color:var(--color-foreground)]">
        Próximamente: registro de horas por día y carga masiva.
      </div>
    </ProtectedPage>
  );
}

