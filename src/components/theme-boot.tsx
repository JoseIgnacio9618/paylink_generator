"use client";

import { useEffect } from "react";

type Theme = "light" | "dark";

function resolveTheme(): Theme {
  const stored = window.localStorage.getItem("theme");

  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeBoot() {
  useEffect(() => {
    const theme = resolveTheme();
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, []);

  return null;
}
