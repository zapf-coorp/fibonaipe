import type { MiniCard, Seat } from "./model.js";
import { useI18n } from "../../client/i18n/index.js";
import { SUIT_GLYPH } from "./Deck.js";
import styles from "./SeatList.module.css";

export function SeatList({
  seats,
  selfId,
  cards = {},
}: {
  readonly seats: readonly Seat[];
  readonly selfId: string | null;
  readonly cards?: Readonly<Record<string, MiniCard>>;
}) {
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
            {cards[seat.id] ? (
              <span
                className={styles.mini}
                data-face={cards[seat.id]?.faceUp ? "up" : "down"}
                data-suit={cards[seat.id]?.suit}
                role={cards[seat.id]?.faceUp ? "img" : undefined}
                aria-label={cards[seat.id]?.faceUp ? `${cards[seat.id]?.card}` : undefined}
                aria-hidden={cards[seat.id]?.faceUp ? undefined : true}
              >
                {cards[seat.id]?.faceUp ? (
                  <>
                    <b>{cards[seat.id]?.card}</b>
                    <i aria-hidden="true">{SUIT_GLYPH[cards[seat.id]?.suit ?? "joker"] ?? SUIT_GLYPH.joker}</i>
                  </>
                ) : null}
              </span>
            ) : null}
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
