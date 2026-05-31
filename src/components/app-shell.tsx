"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="relative flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className={cn(
                "inline-flex shrink-0 items-center gap-3 rounded-full border px-2.5 py-2 pr-4 shadow-[0_10px_30px_rgba(18,34,38,0.08)]",
                pathname === "/"
                  ? "border-accent/30 bg-surface text-foreground"
                  : "border-border bg-surface/88 text-foreground hover:border-accent/45",
              )}
              aria-label="Ir a inicio"
            >
              <span
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold",
                  pathname === "/"
                    ? "bg-accent text-white"
                    : "bg-surface-strong text-accent",
                )}
              >
                <span className="font-mono text-[12px] uppercase tracking-[0.18em]">PG</span>
              </span>
              <span className="text-sm font-semibold tracking-tight">Paylink</span>
            </Link>

            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-accent">
                {appName}
              </p>
              <p className="truncate text-sm text-muted">
                {currentItem?.description ?? "Panel privado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-border bg-surface/85 px-4 py-2 text-right shadow-[0_10px_30px_rgba(18,34,38,0.08)] sm:block">
              <p className="text-sm font-semibold text-foreground">{currentUser.displayName}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {currentUser.role}
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/85 px-4 py-2 text-sm font-medium text-foreground shadow-[0_10px_30px_rgba(18,34,38,0.08)] hover:border-accent/50 hover:text-accent"
                aria-expanded={open}
                aria-haspopup="menu"
              >
                <span>Menú</span>
                <span className={cn("text-xs transition-transform", open && "rotate-180")}>
                  ▼
                </span>
              </button>

              {open ? (
                <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[var(--shadow)]">
                  <div className="border-b border-border/80 px-4 py-3">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                      Navegación
                    </p>
                  </div>
                  <div className="p-2">
                    {navItems.map((item, index) => {
                      const active = isItemActive(item.href, pathname);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block rounded-[1.1rem] px-4 py-3",
                            active
                              ? "bg-accent text-white"
                              : "text-foreground hover:bg-surface-strong",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{item.label}</p>
                            <span
                              className={cn(
                                "font-mono text-[11px] uppercase tracking-[0.22em]",
                                active ? "text-white/72" : "text-muted",
                              )}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-1 text-sm",
                              active ? "text-white/82" : "text-muted",
                            )}
                          >
                            {item.description}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={signOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/85 px-4 py-2 text-sm font-medium text-foreground shadow-[0_10px_30px_rgba(18,34,38,0.08)] hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Saliendo..." : "Salir"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
