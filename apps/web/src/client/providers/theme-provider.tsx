import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { t, type TranslationKey } from "../i18n/index.js";
import { useLiveAnnouncer } from "./live-announcer.js";

export const THEME_STORAGE_KEY = "fibonaipe.theme";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#0F52BA",
  dark: "#0B0F17",
};

const THEME_LABEL: Record<ThemeMode, TranslationKey> = {
  light: "header.theme.light",
  dark: "header.theme.dark",
  system: "header.theme.system",
};

interface ThemeContextValue {
  readonly mode: ThemeMode;
  readonly resolvedTheme: ResolvedTheme;
  readonly setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) return stored;
  } catch {
    return "system";
  }
  return "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isProjectorRoute(): boolean {
  return window.location.pathname.endsWith("/screen");
}

function resolveTheme(mode: ThemeMode, dark: boolean): ResolvedTheme {
  if (isProjectorRoute()) return "dark";
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return dark ? "dark" : "light";
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector("meta[name='theme-color']");
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved]);
}

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const { announce } = useLiveAnnouncer();
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readStoredMode(), prefersDark()));
  const resolved = resolveTheme(mode, prefersDark());
  applyResolvedTheme(resolved);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => {
      if (mode !== "system" || isProjectorRoute()) return;
      const next = resolveTheme("system", media.matches);
      setResolvedTheme(next);
      applyResolvedTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [mode]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // QuotaExceededError and private browsing still apply the theme.
      }
      const nextResolved = resolveTheme(next, prefersDark());
      setModeState(next);
      setResolvedTheme(nextResolved);
      applyResolvedTheme(nextResolved);
      announce(t("announcements.themeChanged", { theme: t(THEME_LABEL[next]) }), "polite");
    },
    [announce],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme: resolvedTheme === resolved ? resolvedTheme : resolved,
      setMode,
    }),
    [mode, resolved, resolvedTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
