import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useI18n, type SupportedLocale, type TranslationKey } from "../../i18n/index.js";
import { useLiveAnnouncer } from "../../providers/live-announcer.js";
import { useTheme, type ThemeMode } from "../../providers/theme-provider.js";
import { touchTargetStyle } from "../../touch-target.js";
import { useConnectionStatus } from "../../connection/status.js";
import { signOut, useAccount } from "../../../features/auth/account.js";
import { can, seatsOf, selfId } from "../../../features/planning/model.js";
import { requestRoomMenu } from "../../../features/planning/room-menu.js";
import { useRoomView } from "../../../features/planning/room-store.js";
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
  const connection = useConnectionStatus();
  const place = useOwnSeat();
  return (
    <header role="banner" className={styles.header}>
      <a href="/" className={styles.control} style={touchTargetStyle} aria-label={t("app.title")}>
        <span className={styles.mark} aria-hidden="true">
          <span className={styles.glyphRun}>♠♣♥♦</span>
          <span className={styles.mini} data-face="heart" />
          <span className={styles.mini} data-face="spade" />
          <span className={styles.mini} data-face="mystery" />
        </span>
        <span className={styles.word}>{t("app.title")}</span>
      </a>
      <ConnectionStatusPill status={connection} presence={place.seat?.online ? "on" : "off"} />
      <ProfileMenu seat={place} />
    </header>
  );
}

function useOwnSeat() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const code = /^\/r\/([^/]+)$/.exec(pathname)?.[1] ?? "";
  const view = useRoomView(code);
  const mine = view ? selfId(view) : null;
  const seat = view ? seatsOf(view).find((row) => row.id === mine) : undefined;
  const roomName = view && typeof view.name === "string" ? view.name : "";
  return { seat, roomName, view };
}

function ProfileMenu({ seat: place }: { readonly seat: ReturnType<typeof useOwnSeat> }) {
  const { t } = useI18n();
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const { seat, roomName, view } = place;
  const name = user?.displayName || seat?.nickname || t("profile.guest");
  const label = roomName ? `${name} / ${roomName}` : name;
  return (
    <div className={styles.profile}>
      <button
        type="button"
        className={styles.profileButton}
        style={touchTargetStyle}
        aria-expanded={open}
        aria-controls="profile-menu"
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(name)}
        </span>
        <span className={styles.profileName}>{label}</span>
      </button>
      {open ? (
        <div id="profile-menu" className={styles.menu}>
          {user ? (
            <a className={styles.menuAction} href="/teams" style={touchTargetStyle}>{t("teams.title")}</a>
          ) : (
            <a className={styles.menuAction} href="/dev/login" style={touchTargetStyle}>{t("profile.signIn")}</a>
          )}
          {user ? (
            <button
              type="button"
              className={styles.menuAction}
              style={touchTargetStyle}
              onClick={() => {
                void signOut().then(() => {
                  window.location.assign("/");
                });
              }}
            >
              {t("profile.signOut")}
            </button>
          ) : null}
          <LocaleSelector />
          <ThemeToggle />
          {view && can(view, "updateRoomSettings") ? (
            <button type="button" className={styles.menuAction} style={touchTargetStyle} onClick={() => requestRoomMenu("settings")}>
              {t("planning.settings")}
            </button>
          ) : null}
          {view && can(view, "setFinalEstimate") ? (
            <button type="button" className={styles.menuAction} style={touchTargetStyle} onClick={() => requestRoomMenu("estimate")}>
              {t("planning.estimate")}
            </button>
          ) : null}
          {view ? (
            <button type="button" className={styles.menuAction} style={touchTargetStyle} onClick={() => requestRoomMenu("qr")}>
              {t("share.showQr")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  const first = parts[0];
  const second = parts[1];
  if (!first) return "?";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
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
    </select>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const { mode, setMode } = useTheme();
  return (
    <select
      aria-label={t("header.theme.label")}
      value={mode}
      style={touchTargetStyle}
      onChange={(event) => setMode(event.target.value as ThemeMode)}
    >
      {THEME_CHOICES.map((choice) => (
        <option key={choice} value={choice}>
          {t(choice === "light" ? "header.theme.light" : choice === "dark" ? "header.theme.dark" : "header.theme.system")}
        </option>
      ))}
    </select>
  );
}
