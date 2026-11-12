import { useEffect, type ReactNode } from "react";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import styles from "./TeamsPage.module.css";

export function TeamDialog({
  titleId,
  title,
  onClose,
  grow = false,
  children,
}: {
  readonly titleId: string;
  readonly title: string;
  readonly onClose: () => void;
  readonly grow?: boolean;
  readonly children: ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={grow ? styles.overlayGrow : styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={grow ? `${styles.dialog} ${styles.dialogGrow}` : styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHead}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.close")} onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
