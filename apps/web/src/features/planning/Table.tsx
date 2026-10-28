import { useState } from "react";
import { QrCode } from "../../client/components/share/QrCode.js";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { castVote, revealRound } from "./commands.js";
import { Deck } from "./Deck.js";
import { EstimateDialog } from "./EstimateDialog.js";
import { ImportDialog } from "./ImportDialog.js";
import {
  activeCards,
  can,
  currentItem,
  finalEstimate,
  itemsOf,
  ownCard,
  ownComment,
  roundStateOf,
  roundStatus,
  seatsOf,
  selfId,
  suitAxisOn,
  type RoomView,
} from "./model.js";
import { QueueDrawer } from "./QueueDrawer.js";
import { ResultBanner } from "./ResultBanner.js";
import { SeatList } from "./SeatList.js";
import { SettingsSheet } from "./SettingsSheet.js";
import { SuitToggle } from "./SuitToggle.js";
import styles from "./Table.module.css";
import { Timer } from "./Timer.js";

type DialogName = "queue" | "import" | "settings" | "estimate" | "qr";

export function Table({ code, view }: { readonly code: string; readonly view: RoomView }) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [suit, setSuit] = useState("joker");
  const state = roundStateOf(view);
  const locked = state === "revealed" || state === "estimated";
  const revealed = locked || roundStatus(view) === "revealed";
  const mine = selfId(view);
  const away = seatsOf(view).some((seat) => seat.id === mine && seat.afk);
  const showDeck = can(view, "vote") && !away;
  const estimate = finalEstimate(view);
  const item = currentItem(view);
  const open = (name: DialogName) => setDialog(name);

  return (
    <section role="region" aria-label={t("planning.table")} data-round-state={state} className={styles.table}>
      {ownComment(view) ? <p>{ownComment(view)}</p> : null}
      {item ? <h1>{item.title}</h1> : null}
      <SeatList seats={seatsOf(view)} selfId={mine} />
      {away ? (
        <div>
          <p>{t("planning.away")}</p>
          <button type="button" style={touchTargetStyle} onClick={() => castVote(code, "1", "joker", "return")}>
            {t("planning.return")}
          </button>
        </div>
      ) : null}
      {showDeck ? <Deck code={code} cards={activeCards(view)} selected={ownCard(view)} locked={locked} suit={suit} /> : null}
      {showDeck && suitAxisOn(view) ? <SuitToggle suit={suit} onChange={setSuit} /> : null}
      {locked ? <p>{t("planning.revealed")}</p> : null}
      {estimate ? (
        <p>
          {t("planning.estimate")} {estimate}
        </p>
      ) : null}
      {revealed ? <ResultBanner view={view} /> : null}
      <Timer code={code} view={view} canStart={can(view, "hostRoom") || can(view, "updateRoomSettings")} />
      {can(view, "revealRound") ? (
        <button type="button" style={touchTargetStyle} onClick={() => revealRound(code)}>
          {t("planning.reveal")}
        </button>
      ) : null}
      {can(view, "manageQueue") ? (
        <button type="button" style={touchTargetStyle} onClick={() => open("queue")}>
          {t("planning.queue")}
        </button>
      ) : null}
      {can(view, "updateRoomSettings") ? (
        <button type="button" style={touchTargetStyle} onClick={() => open("settings")}>
          {t("planning.settings")}
        </button>
      ) : null}
      {can(view, "setFinalEstimate") ? (
        <button type="button" style={touchTargetStyle} onClick={() => open("estimate")}>
          {t("planning.estimate")}
        </button>
      ) : null}
      <button type="button" style={touchTargetStyle} onClick={() => open("qr")}>
        {t("share.showQr")}
      </button>
      {dialog === "queue" ? <QueueDrawer code={code} view={view} items={itemsOf(view)} onImport={() => open("import")} /> : null}
      {dialog === "import" ? <ImportDialog code={code} onDone={() => open("queue")} /> : null}
      {dialog === "settings" ? <SettingsSheet view={view} /> : null}
      {dialog === "estimate" ? <EstimateDialog code={code} view={view} onClose={() => setDialog(null)} /> : null}
      {dialog === "qr" ? (
        <div role="dialog" aria-label={t("share.qrTitle")} aria-modal="true">
          <QrCode value={`${window.location.origin}/r/${code}`} />
        </div>
      ) : null}
    </section>
  );
}
