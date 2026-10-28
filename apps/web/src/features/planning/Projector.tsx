import { QrCode } from "../../client/components/share/QrCode.js";
import { useI18n } from "../../client/i18n/index.js";
import { currentItem, roundStateOf, roundStatus, seatsOf, type RoomView } from "./model.js";
import { ResultBanner } from "./ResultBanner.js";
import { SeatList } from "./SeatList.js";
import styles from "./Projector.module.css";

export function Projector({ code, view }: { readonly code: string; readonly view: RoomView }) {
  const { t } = useI18n();
  const status = roundStatus(view);
  const phase = status === "voting" ? "voting" : status === "revealed" || roundStateOf(view) === "revealed" ? "revealed" : "waiting";
  const title = currentItem(view)?.title ?? "";
  return (
    <section role="region" aria-label={t("planning.projector")} data-projector-state={phase} className={styles.screen}>
      <h1 className={styles.title} style={{ fontSize: "48px" }}>
        {title}
      </h1>
      {phase === "voting" || phase === "revealed" ? <SeatList seats={seatsOf(view)} selfId={null} /> : null}
      {phase === "revealed" ? <ResultBanner view={view} /> : null}
      <QrCode value={`${window.location.origin}/r/${code}`} />
    </section>
  );
}
