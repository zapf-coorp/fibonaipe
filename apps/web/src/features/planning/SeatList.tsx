import type { Seat } from "./model.js";
import { useI18n } from "../../client/i18n/index.js";

export function SeatList({ seats, selfId }: { readonly seats: readonly Seat[]; readonly selfId: string | null }) {
  const { t } = useI18n();
  return (
    <ul>
      {seats.slice(0, 30).map((seat) => {
        const observer = seat.mode === "observer" || seat.role === "observer";
        return (
          <li key={seat.id} aria-label={seat.nickname}>
            <span>{seat.nickname}</span>
            {seat.id === selfId ? <span>{t("planning.you")}</span> : null}
            <span>{observer ? t("planning.observer") : seat.role || t("planning.voter")}</span>
            <span>{seat.online ? t("planning.online") : t("planning.offline")}</span>
            <span>{seat.hasVoted ? t("planning.voted") : t("planning.waitingVote")}</span>
            {seat.afk ? <span>{t("planning.afk")}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
