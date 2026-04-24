"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { signOutCurrentUser } from "@/features/auth/services/authService";
import { AppShell } from "@/shared/ui/navigation/AppShell";

type Props = {
  children: ReactNode;
  title?: string;
};

export function ProtectedPage({ children, title }: Props) {
  const router = useRouter();
  const { user, loading } = useAuthState();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[color:var(--color-background)] font-sans">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
          Cargando…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[color:var(--color-background)] font-sans">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-muted)]">
          Redirigiendo al inicio de sesión…
        </div>
      </div>
    );
  }

  return (
    <AppShell
      user={{
        name: user.displayName,
        email: user.email,
        photoUrl: user.photoURL,
      }}
      onSignOut={() => signOutCurrentUser()}
    >
      {title ? (
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {title}
        </h1>
      ) : null}
      {children}
    </AppShell>
  );
}
