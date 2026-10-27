import { useI18n, type SupportedLocale, type TranslationKey } from "../../i18n/index.js";
import { useLiveAnnouncer } from "../../providers/live-announcer.js";
import { useTheme, type ThemeMode } from "../../providers/theme-provider.js";
import { touchTargetStyle } from "../../touch-target.js";
import { ConnectionStatusPill } from "../status/ConnectionStatusPill.js";
import styles from "./AppHeader.module.css";

const LOCALE_LABEL: Record<SupportedLocale, TranslationKey> = {
  "pt-BR": "header.locale.ptBR",
  "en-US": "header.locale.enUS",
  "es-ES": "header.locale.esES",
};

const THEME_CHOICES: readonly ThemeMode[] = ["light", "dark", "system"];

export function AppHeader() {
  const { t } = useI18n();
  return (
    <header role="banner" className={styles.header}>
      <a href="/" className={styles.control} style={touchTargetStyle} aria-label={t("app.title")}>
        <span aria-hidden="true">♠♣♥♦</span>
        {t("app.title")}
      </a>
      <ConnectionStatusPill />
      <LocaleSelector />
      <ThemeToggle />
    </header>
  );
}

function LocaleSelector() {
  const { locale, setLocale, t } = useI18n();
  const { announce } = useLiveAnnouncer();
  return (
    <select
      aria-label={t("header.locale.label")}
      value={locale}
      style={touchTargetStyle}
      onChange={(event) => {
        const next = event.target.value as SupportedLocale;
        setLocale(next);
        announce(t("announcements.localeChanged", { locale: t(LOCALE_LABEL[next]) }), "polite");
      }}
    >
      <option value="pt-BR">{t("header.locale.ptBR")}</option>
      <option value="en-US">{t("header.locale.enUS")}</option>
      <option value="es-ES">{t("header.locale.esES")}</option>
    </select>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const { setMode } = useTheme();
  return (
    <div role="group" aria-label={t("header.theme.label")} className={styles.group}>
      {THEME_CHOICES.map((mode) => (
        <button key={mode} type="button" className={styles.hit} style={touchTargetStyle} onClick={() => setMode(mode)}>
          {t(mode === "light" ? "header.theme.light" : mode === "dark" ? "header.theme.dark" : "header.theme.system")}
        </button>
      ))}
    </div>
  );
}
