import { useI18n, type TranslationKey } from "../../i18n/index.js";
import { touchTargetStyle } from "../../touch-target.js";
import styles from "./ConnectionStatusPill.module.css";

export type ConnectionStatus = "connected" | "syncing" | "reconnecting";

const STATUS_LABEL: Record<ConnectionStatus, TranslationKey> = {
  connected: "header.status.connected",
  syncing: "header.status.syncing",
  reconnecting: "header.status.reconnecting",
};

export function ConnectionStatusPill({
  status = "connected",
  presence = "off",
}: {
  readonly status?: ConnectionStatus;
  readonly presence?: "on" | "off";
}) {
  const { t } = useI18n();
  return (
    <span role="status" className={styles.pill} data-status={status} style={touchTargetStyle}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="4" fill="currentColor" />
      </svg>
      <span className="sr-only">{t(STATUS_LABEL[status])}</span>
      <span>{t(presence === "on" ? "profile.on" : "profile.off")}</span>
    </span>
  );
}
