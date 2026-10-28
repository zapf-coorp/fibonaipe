import { LOCALE_STORAGE_KEY, setCurrentLocale, type SupportedLocale } from "../i18n/index.js";

export function applyAccountLocale(locale: SupportedLocale): void {
  setCurrentLocale(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Quota or private mode must not block the account locale.
  }
  document.documentElement.lang = locale;
}
