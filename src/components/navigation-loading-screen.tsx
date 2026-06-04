"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function NavigationLoadingScreen({
  variant,
}: {
  variant: "fullscreen" | "panel";
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) {
    return (
      <div
        aria-hidden="true"
        className={variant === "fullscreen" ? "min-h-screen" : "min-h-[24rem]"}
      />
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando pantalla"
      className={cn(
        "flex items-center justify-center",
        variant === "fullscreen" ? "min-h-screen px-6 py-10" : "min-h-[24rem] px-4 py-8",
      )}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,249,241,0.94),rgba(255,249,241,0.76))] p-6 shadow-[var(--shadow)] dark:bg-[linear-gradient(180deg,rgba(24,29,36,0.96),rgba(24,29,36,0.8))]">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="absolute -right-12 top-4 h-28 w-28 rounded-full bg-accent/10 blur-3xl dark:bg-accent/14" />
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-accent/25 bg-accent/10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
            <div className="absolute h-2.5 w-2.5 rounded-full bg-accent-warm shadow-[0_0_24px_rgba(215,154,78,0.45)]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
              Navegacion
            </p>
            <h2 className="mt-2 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.04em] text-foreground">
              Cargando pantalla
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Estamos preparando el siguiente contenido para que la navegacion no se quede bloqueada.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-accent/12" />
          <div className="h-4 w-full animate-pulse rounded-full bg-foreground/7 dark:bg-white/8" />
          <div className="h-4 w-[86%] animate-pulse rounded-full bg-foreground/7 dark:bg-white/8" />
          <div className="h-4 w-[64%] animate-pulse rounded-full bg-foreground/7 dark:bg-white/8" />
        </div>
      </div>
    </div>
  );
}
