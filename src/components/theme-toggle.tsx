"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle() {
  return <ThemeToggleInner compact={false} />;
}

export function ThemeToggleCompact() {
  return <ThemeToggleInner compact />;
}

function ThemeToggleInner({ compact }: { compact: boolean }) {
  const [theme, setTheme] = useState<Theme>(() => getCurrentTheme());

  function toggleTheme() {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        compact
          ? "inline-flex size-12 items-center justify-center rounded-[1rem] border text-sm font-medium backdrop-blur-sm"
          : "inline-flex items-center gap-3 rounded-[1.35rem] border px-3.5 py-3 text-sm font-medium backdrop-blur-sm",
        "border-border/80 bg-surface/88 text-foreground shadow-[0_14px_28px_rgba(58,44,34,0.08)] hover:-translate-y-0.5 hover:border-accent/45 hover:text-accent",
      )}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span
        className={cn(
          compact
            ? "inline-flex size-8 items-center justify-center rounded-[0.9rem] text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
            : "inline-flex size-9 items-center justify-center rounded-[1rem] text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
          isDark ? "bg-accent text-white" : "bg-surface-strong text-accent",
        )}
      >
        {isDark ? "☾" : "☀"}
      </span>
      {!compact ? (
        <span className="flex flex-col items-start leading-none">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Apariencia
          </span>
          <span className="mt-1 text-sm font-semibold">
            {isDark ? "Modo oscuro" : "Modo claro"}
          </span>
        </span>
      ) : null}
    </button>
  );
}
