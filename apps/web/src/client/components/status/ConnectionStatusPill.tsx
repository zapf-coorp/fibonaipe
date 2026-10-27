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
      {t(STATUS_LABEL[status])}
    </span>
  );
}
