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
}

export function ThemeToggle() {
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
        "inline-flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur-sm",
        "border-border bg-surface/80 text-foreground hover:border-accent/50 hover:text-accent",
      )}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold",
          isDark ? "bg-accent text-white" : "bg-surface-strong text-accent",
        )}
      >
        {isDark ? "☾" : "☀"}
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Apariencia
        </span>
        <span className="mt-1 text-sm font-semibold">
          {isDark ? "Modo oscuro" : "Modo claro"}
        </span>
      </span>
    </button>
  );
}
