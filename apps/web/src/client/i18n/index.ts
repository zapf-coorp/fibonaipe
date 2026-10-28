import { createContext, createElement, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { messageKeyFor } from "./error-keys.js";
import enUS from "./locales/en-US.json";
import esES from "./locales/es-ES.json";
import ptBR from "./locales/pt-BR.json";

export const LOCALE_STORAGE_KEY = "fibonaipe.locale";

export type SupportedLocale = "pt-BR" | "en-US" | "es-ES";

type Catalog = typeof ptBR;

type LeafKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? LeafKeys<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type TranslationKey = LeafKeys<Catalog>;

const catalogs: Record<SupportedLocale, Catalog> = {
  "pt-BR": ptBR,
  "en-US": enUS as Catalog,
  "es-ES": esES as Catalog,
};

let currentLocale: SupportedLocale = "pt-BR";

export function setCurrentLocale(locale: SupportedLocale): void {
  currentLocale = locale;
}

function isSupportedLocale(value: string | null): value is SupportedLocale {
  return value === "pt-BR" || value === "en-US" || value === "es-ES";
}

function readStoredLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    return "pt-BR";
  }
  return "pt-BR";
}

function lookup(locale: SupportedLocale, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = catalogs[locale];
  for (const part of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, params?: Readonly<Record<string, string | number>>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function t(key: TranslationKey, params?: Readonly<Record<string, string | number>>): string {
  const template = lookup(currentLocale, key) ?? lookup("pt-BR", key) ?? key;
  return interpolate(template, params);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale, options).format(value);
}

export function formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(currentLocale, options).format(new Date(value));
}

interface I18nContextValue {
  readonly locale: SupportedLocale;
  readonly t: typeof t;
  readonly formatNumber: typeof formatNumber;
  readonly formatDate: typeof formatDate;
  readonly setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const initial = readStoredLocale();
    currentLocale = initial;
    return initial;
  });
  currentLocale = locale;
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }

  const setLocale = useCallback((next: SupportedLocale) => {
    currentLocale = next;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Quota or private mode must not block the language switch.
    }
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t,
      formatNumber,
      formatDate,
      setLocale,
    }),
    [locale, setLocale],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}

export { messageKeyFor };
