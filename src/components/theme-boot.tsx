import Script from "next/script";

const themeBootScript = `
(() => {
  const COOKIE_KEY = "theme";
  const STORAGE_KEY = "theme";

  const readCookieTheme = () => {
    const match = document.cookie.match(/(?:^|; )theme=(dark|light)(?:;|$)/);
    return match ? match[1] : null;
  };

  const persistTheme = (theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {}

    document.cookie = COOKIE_KEY + "=" + theme + "; path=/; max-age=31536000; samesite=lax";
  };

  let theme = null;

  if (theme !== "dark" && theme !== "light") {
    const cookieTheme = readCookieTheme();
    if (cookieTheme === "dark" || cookieTheme === "light") {
      theme = cookieTheme;
    }
  }

  if (theme !== "dark" && theme !== "light") {
    try {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (storedTheme === "dark" || storedTheme === "light") {
        theme = storedTheme;
      }
    } catch {}
  }

  if (theme !== "dark" && theme !== "light") {
    theme = "dark";
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  persistTheme(theme);
})();
`;

export function ThemeBoot() {
  return (
    <Script id="theme-boot" strategy="beforeInteractive">
      {themeBootScript}
    </Script>
  );
}
