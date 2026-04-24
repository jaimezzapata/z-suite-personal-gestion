"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { signOutCurrentUser } from "@/features/auth/services/authService";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuthState();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return (
    <div className="flex min-h-dvh flex-col font-sans">
      <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-6 py-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div className="text-sm font-semibold tracking-tight text-[color:var(--color-foreground)]">
            Z-Suite Personal
          </div>
          <div className="flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-[color:var(--color-muted)]">Cargando…</span>
            ) : user ? (
              <>
                <span className="max-w-[200px] truncate text-[color:var(--color-muted)]">
                  {user.email ?? user.displayName ?? "Usuario"}
                </span>
                <button
                  type="button"
                  onClick={() => signOutCurrentUser()}
                  className="h-9 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-surface-2)]"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="h-9 rounded-2xl bg-[color:var(--color-primary)] px-3 py-2 font-medium text-[color:var(--color-primary-foreground)] hover:opacity-95"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
          Dashboard
        </h1>
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

        {!loading && !user ? (
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
            Redirigiendo al inicio de sesión…
          </div>
        ) : null}
      </main>
    </div>
  );
}
