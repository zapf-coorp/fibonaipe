import type { Seat } from "./model.js";
import { useI18n } from "../../client/i18n/index.js";
import styles from "./SeatList.module.css";

export function SeatList({ seats, selfId }: { readonly seats: readonly Seat[]; readonly selfId: string | null }) {
  const { t } = useI18n();
  return (
    <ul className={styles.list}>
      {seats.slice(0, 30).map((seat) => {
        const observer = seat.mode === "observer" || seat.role === "observer";
        const role = observer ? t("planning.observer") : seat.role || t("planning.voter");
        return (
          <li
            key={seat.id}
            className={styles.seat}
            aria-label={seat.id === selfId ? `${seat.nickname}, ${t("planning.you")}` : seat.nickname}
            data-self={seat.id === selfId ? "true" : "false"}
          >
            <span className={styles.name}>{seat.nickname}</span>
            <span className={styles.role}>{role}</span>
            <span className={styles.meta}>
              <span
                className={styles.light}
                data-on={seat.online ? "true" : "false"}
                role="img"
                aria-label={seat.online ? t("planning.online") : t("planning.offline")}
              />
              <span
                className={styles.check}
                data-on={seat.hasVoted ? "true" : "false"}
                role="img"
                aria-label={seat.hasVoted ? t("planning.voted") : t("planning.waitingVote")}
              >
                {seat.hasVoted ? (
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 6.2 4.6 9 10 3" />
                  </svg>
                ) : null}
              </span>
              {seat.afk ? (
                <span className={styles.afk} role="img" aria-label={t("planning.afk")}>
                  <svg viewBox="0 0 16 10" aria-hidden="true">
                    <path d="M1 8 4 2h2L3 8zm6 0 3-6h2l-3 6z" />
                  </svg>
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
