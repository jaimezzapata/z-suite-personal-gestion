"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";

import {
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings,
  X,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
};

type Props = {
  user?: {
    name?: string | null;
    email?: string | null;
    photoUrl?: string | null;
  } | null;
  onSignOut?: () => Promise<void> | void;
  children: ReactNode;
};

export function AppShell({ user, onSignOut, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setOpen(media.matches);
    apply();
    const handler = () => apply();
    if (media.addEventListener) media.addEventListener("change", handler);
    else media.addListener(handler);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", handler);
      else media.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.matchMedia("(min-width: 768px)").matches) return;
    }
    setOpen(false);
  }, [pathname]);

  const items = useMemo<NavItem[]>(
    () => [
      { label: "Dashboard", href: "/", Icon: LayoutDashboard },
      { label: "Empresas", href: "/empresas", Icon: Building2 },
      { label: "Horarios", href: "/horarios", Icon: CalendarDays },
      { label: "Horas", href: "/horas", Icon: Clock },
      { label: "Gastos", href: "/gastos", Icon: CreditCard },
      { label: "Colillas", href: "/colillas", Icon: ReceiptText },
      { label: "Ajustes", href: "/ajustes", Icon: Settings },
    ],
    [],
  );

  return (
    <div className="min-h-dvh bg-[color:var(--color-background)] font-sans">
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px hover:bg-[color:var(--color-surface-2)] active:translate-y-0 active:scale-[0.99]"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl px-2 py-1 text-sm font-semibold tracking-tight text-[color:var(--color-foreground)]"
            >
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-primary)]" />
              Z-Suite Personal
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-4 w-40 rounded-full bg-[color:var(--color-surface-2)]" />
          </div>
        </div>
      </header>

      <div
        className={[
          "mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6",
          open ? "md:grid-cols-[320px_1fr]" : "md:grid-cols-1",
        ].join(" ")}
      >
        <div
          onClick={() => setOpen(false)}
          className={[
            "fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity md:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        />

        <aside
          className={[
            "fixed left-0 top-14 z-50 h-[calc(100dvh-56px)] w-[290px] rounded-r-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 shadow-sm transition-transform md:sticky md:top-20 md:z-auto md:h-[calc(100dvh-80px)] md:w-[320px] md:rounded-3xl md:shadow-sm",
            open ? "translate-x-0" : "-translate-x-full",
            open ? "" : "md:w-0 md:overflow-hidden md:border-r-0 md:p-0",
          ].join(" ")}
        >
          <nav className="flex h-full flex-col gap-1">
            {items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

              const Icon = item.Icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[color:var(--postit-purple)] text-[color:var(--color-foreground)]"
                      : "text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-foreground)]",
                  ].join(" ")}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {user && onSignOut ? (
              <div className="mt-auto pt-3">
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.name ?? user.email ?? "Usuario"}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-[color:var(--postit-blue)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                        {user.name ?? "Usuario"}
                      </div>
                      <div className="truncate text-xs text-[color:var(--color-muted)]">
                        {user.email ?? ""}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSignOut()}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm font-semibold text-[color:var(--color-foreground)] shadow-sm transition-transform duration-150 hover:-translate-y-px hover:bg-[color:var(--color-surface)]/80 active:translate-y-0 active:scale-[0.99]"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
