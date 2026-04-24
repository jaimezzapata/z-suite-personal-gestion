"use client";

import { Globe, Lock, LogIn, Mail, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { toast } from "@/shared/ui/toast";

type Props = {
  onGoogle: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<void>;
};

export function LoginView({ onGoogle, onEmailSignIn, onEmailSignUp }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await onEmailSignIn(email, password);
      } else {
        await onEmailSignUp(email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      toast.error({ title: "Error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await onGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      toast.error({ title: "Error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh w-full place-items-center overflow-hidden px-6 py-10 font-sans">
      <div className="pointer-events-none absolute -left-12 -top-10 h-44 w-56 rotate-[-6deg] rounded-3xl bg-[color:var(--postit-yellow)] opacity-70 shadow-sm" />
      <div className="pointer-events-none absolute -right-14 top-16 h-40 w-52 rotate-[8deg] rounded-3xl bg-[color:var(--postit-blue)] opacity-70 shadow-sm" />
      <div className="pointer-events-none absolute left-8 bottom-10 h-36 w-48 rotate-[12deg] rounded-3xl bg-[color:var(--postit-pink)] opacity-65 shadow-sm" />
      <div className="pointer-events-none absolute right-10 -bottom-12 h-44 w-60 rotate-[-10deg] rounded-3xl bg-[color:var(--postit-green)] opacity-60 shadow-sm" />

      <div className="w-full max-w-sm animate-[fade-in-up_260ms_ease-out] rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85 p-6 shadow-sm backdrop-blur">
        <div className="mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-1 text-xs font-medium text-[color:var(--color-muted)]">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />
            Z-Suite Personal
          </div>
          <div className="flex w-full items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              disabled={loading}
              className={[
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all disabled:opacity-60",
                mode === "signin"
                  ? "bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] shadow-sm"
                  : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
              ].join(" ")}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              disabled={loading}
              className={[
                "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all disabled:opacity-60",
                mode === "signup"
                  ? "bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] shadow-sm"
                  : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
              ].join(" ")}
            >
              Crear cuenta
            </button>
          </div>
          <p className="text-sm text-[color:var(--color-muted)]">
            Accede con Google o con correo y contraseña.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm font-medium text-[color:var(--color-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px hover:bg-[color:var(--color-surface-2)] active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
        >
          <Globe className="h-4 w-4 text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-foreground)]" />
          Continuar con Google
        </button>

        <div className="my-5 h-px w-full bg-[color:var(--color-border)]" />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[color:var(--color-foreground)]">
              Correo
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
                placeholder="tucorreo@dominio.com"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-10 pr-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[color:var(--color-foreground)]">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                placeholder="••••••••"
                className="h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-10 pr-3 text-sm text-[color:var(--color-foreground)] outline-none transition-colors duration-150 placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-primary)] focus:ring-4 focus:ring-[color:var(--primary-ring)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 text-sm font-semibold text-[color:var(--color-primary-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
          >
            {mode === "signin" ? (
              <LogIn className="h-4 w-4 opacity-90" />
            ) : (
              <UserPlus className="h-4 w-4 opacity-90" />
            )}
            {mode === "signin" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-xs text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
