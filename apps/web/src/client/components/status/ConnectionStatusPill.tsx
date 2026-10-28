import { useI18n, type TranslationKey } from "../../i18n/index.js";
import { touchTargetStyle } from "../../touch-target.js";
import styles from "./ConnectionStatusPill.module.css";

export type ConnectionStatus = "connected" | "syncing" | "reconnecting";

const STATUS_LABEL: Record<ConnectionStatus, TranslationKey> = {
  connected: "header.status.connected",
  syncing: "header.status.syncing",
  reconnecting: "header.status.reconnecting",
};

export function ConnectionStatusPill({ status = "connected" }: { readonly status?: ConnectionStatus }) {
  const { t } = useI18n();
  return (
    <span role="status" className={styles.pill} style={touchTargetStyle}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="4" fill="currentColor" />
      </svg>
      {t(STATUS_LABEL[status])}
    </span>
  );
}
