"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/panel-ui";
import { ThemeToggle, ThemeToggleCompact } from "@/components/theme-toggle";
import { APP_NAV_ITEMS } from "@/lib/navigation";
import type { UserRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function isItemActive(itemHref: string, pathname: string) {
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

export function AppShell({
  appName,
  currentUser,
  children,
}: {
  appName: string;
  currentUser: UserRecord;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navItems = useMemo(
    () => APP_NAV_ITEMS.filter((item) => !item.superadminOnly || currentUser.role === "superadmin"),
    [currentUser.role],
  );

  const currentItem = useMemo(
    () => navItems.find((item) => isItemActive(item.href, pathname)) ?? navItems[0],
    [navItems, pathname],
  );

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="relative min-h-full flex-1 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border/70 lg:flex lg:min-h-screen lg:flex-col lg:bg-background/55">
        <div className="sticky top-0 flex h-screen min-h-0 flex-col gap-4 overflow-y-auto px-6 py-6">
          <div className="rounded-[2rem] border border-border/70 bg-surface/88 p-5 shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-4">
              <Link href="/" className="group block min-w-0 flex-1" aria-label="Ir a inicio">
                <div className="flex items-center">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
                      {appName}
                    </p>
                    <p className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-foreground">
                      Paylink
                    </p>
                  </div>
                </div>
              </Link>
              <ThemeToggleCompact />
            </div>
          </div>

          <nav className="rounded-[2rem] border border-border/70 bg-surface/82 p-3 shadow-[var(--shadow)]">
            <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
              Navegacion
            </p>
            <div className="space-y-2">
              {navItems.map((item, index) => {
                const active = isItemActive(item.href, pathname);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group block rounded-[1.35rem] border px-4 py-3 transition-all",
                      active
                        ? "border-accent/35 bg-accent text-white shadow-[0_18px_34px_rgba(154,79,36,0.2)]"
                        : "border-transparent bg-background/36 text-foreground hover:-translate-y-0.5 hover:border-border hover:bg-surface",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.label}</p>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-[0.22em]",
                          active ? "text-white/70" : "text-muted",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className={cn("mt-1.5 text-sm leading-5", active ? "text-white/78" : "text-muted")}>
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto rounded-[2rem] border border-border/70 bg-surface/82 p-5 shadow-[var(--shadow)]">
            <div className="rounded-[1.5rem] border border-border/70 bg-background/45 p-4">
              <p className="text-base font-semibold text-foreground">{currentUser.displayName}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                {currentUser.role === "superadmin" ? "Superadministrador" : "Usuario"}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={isSigningOut}
              className={`mt-4 w-full ${secondaryButtonClassName}`}
            >
              {isSigningOut ? "Saliendo..." : "Cerrar sesion"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/82 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
                {appName}
              </p>
              <p className="truncate font-[family:var(--font-display)] text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {currentItem?.label ?? "Paylink"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={secondaryButtonClassName}
                aria-expanded={open}
                aria-haspopup="menu"
              >
                {open ? "Cerrar" : "Menu"}
              </button>
            </div>
          </div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-[#120d08]/32 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
            <div
              className="absolute inset-x-4 top-20 rounded-[2rem] border border-border/70 bg-surface/96 p-4 shadow-[var(--shadow)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-4">
                <p className="text-base font-semibold text-foreground">{currentUser.displayName}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
                  {currentUser.role}
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {navItems.map((item, index) => {
                  const active = isItemActive(item.href, pathname);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-[1.4rem] border px-4 py-4",
                        active
                          ? "border-accent/35 bg-accent text-white"
                          : "border-transparent bg-background/35 text-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{item.label}</p>
                        <span className={cn("font-mono text-[10px] uppercase tracking-[0.22em]", active ? "text-white/72" : "text-muted")}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <p className={cn("mt-2 text-sm leading-6", active ? "text-white/78" : "text-muted")}>
                        {item.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={isSigningOut}
                className={cn("mt-4 w-full", primaryButtonClassName)}
              >
                {isSigningOut ? "Saliendo..." : "Cerrar sesion"}
              </button>
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
