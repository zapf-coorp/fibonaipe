import { useEffect, useRef, useState } from "react";
import { QrCode } from "../../client/components/share/QrCode.js";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { loadTeams, useAccount } from "../auth/account.js";
import { castVote, revealRound, startRoundTimer } from "./commands.js";
import { Deck, useFaultPulse } from "./Deck.js";
import { EstimateDialog } from "./EstimateDialog.js";
import {
  activeCards,
  can,
  canRevealNow,
  canStartTimerNow,
  canVoteNow,
  currentItem,
  roomNotice,
  finalEstimate,
  itemsOf,
  miniCards,
  ownCard,
  ownComment,
  roundStateOf,
  roundStatus,
  seatsOf,
  selfId,
  suitAxisOn,
  timerEndsAt,
  type RoomView,
} from "./model.js";
import { QueueDrawer } from "./QueueDrawer.js";
import { ResultBanner } from "./ResultBanner.js";
import { subscribeRoomMenu, type RoomMenuAction } from "./room-menu.js";
import { dismissNotice, useActionFault, useRoomError } from "./room-store.js";
import { SeatList } from "./SeatList.js";
import { SettingsSheet } from "./SettingsSheet.js";
import { SuitToggle } from "./SuitToggle.js";
import { TaskPicker } from "./TaskPicker.js";
import styles from "./Table.module.css";
import { Timer } from "./Timer.js";

type DialogName = "queue" | "settings" | "estimate" | "qr";

export function Table({ code, view }: { readonly code: string; readonly view: RoomView }) {
  const { t } = useI18n();
  const { user, ready } = useAccount();
  const dismissedQueue = useRef(false);
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [teamCheck, setTeamCheck] = useState<"pending" | "yes" | "no">("pending");
  const needsQueue = can(view, "manageQueue") && !itemsOf(view).some((row) => row.status === "current");
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setTeamCheck("no");
      return;
    }
    let active = true;
    void loadTeams().then((rows) => {
      if (active) setTeamCheck(rows.length > 0 ? "yes" : "no");
    });
    return () => {
      active = false;
    };
  }, [ready, user]);
  if (teamCheck === "no" && !dismissedQueue.current && needsQueue && dialog === null) setDialog("queue");
  const closeDialog = () => {
    if (dialog === "queue") dismissedQueue.current = true;
    setDialog(null);
  };
  const error = useRoomError();
  const fault = useActionFault();
  const timerPulse = useFaultPulse(fault.timer ? fault.timerTick : 0);
  const [suit, setSuit] = useState("joker");
  const state = roundStateOf(view);
  const revealed = state === "revealed" || state === "estimated" || roundStatus(view) === "revealed";
  const mine = selfId(view);
  const away = seatsOf(view).some((seat) => seat.id === mine && seat.afk);
  const showDeck = can(view, "vote") && !away;
  const estimate = finalEstimate(view);
  const item = currentItem(view);
  const open = (name: DialogName) => setDialog(name);
  const hostTable = can(view, "hostRoom") || can(view, "updateRoomSettings") || can(view, "revealRound");
  useEffect(() => {
    return subscribeRoomMenu((action: RoomMenuAction) => {
      if (action === "reveal") {
        revealRound(code);
        return;
      }
      if (action === "timer") {
        startRoundTimer(code);
        return;
      }
      setDialog(action);
    });
  }, [code]);

  return (
    <section role="region" aria-label={t("planning.table")} data-round-state={state} className={styles.table}>
      {error || roomNotice(view) ? (
        <button type="button" className={styles.errorBanner} role="alert" onClick={() => dismissNotice(code)}>
          {error ?? t(roomNotice(view) === "planning.voteError" ? "planning.voteError" : "planning.timerError")}
          <span>{t("planning.dismissError")}</span>
        </button>
      ) : null}
      {ownComment(view) ? <p>{ownComment(view)}</p> : null}
      {item ? <h1>{item.title}</h1> : null}
      {can(view, "manageQueue") && itemsOf(view).length > 0 ? <TaskPicker code={code} view={view} /> : null}
      <SeatList seats={seatsOf(view)} selfId={mine} cards={miniCards(view)} />
      {can(view, "manageQueue") || can(view, "revealRound") || hostTable ? (
        <div className={styles.actions}>
          {can(view, "manageQueue") ? (
            <button type="button" style={touchTargetStyle} onClick={() => open("queue")}>
              {t("planning.queue")}
            </button>
          ) : null}
          {can(view, "revealRound") ? (
            <button type="button" style={touchTargetStyle} disabled={!canRevealNow(view)} onClick={() => revealRound(code)}>
              {t("planning.reveal")}
            </button>
          ) : null}
          {hostTable && timerEndsAt(view) === null ? (
            <button
              type="button"
              className={[fault.timer ? styles.cardError : "", fault.timer && timerPulse ? "errorFlash" : ""].filter(Boolean).join(" ") || undefined}
              style={touchTargetStyle}
              disabled={!canStartTimerNow(view)}
              aria-invalid={fault.timer || undefined}
              onClick={() => startRoundTimer(code)}
            >
              {t("planning.startTimer")}
            </button>
          ) : null}
        </div>
      ) : null}
      {away ? (
        <div>
          <p>{t("planning.away")}</p>
          <button type="button" style={touchTargetStyle} onClick={() => castVote(code, "1", "joker", "return")}>
            {t("planning.return")}
          </button>
        </div>
      ) : null}
      <Timer code={code} view={view} canStart={false} />
      {showDeck ? (
        <Deck code={code} cards={activeCards(view)} selected={ownCard(view)} suit={suit} disabled={!canVoteNow(view)} />
      ) : null}
      {showDeck && suitAxisOn(view) ? <SuitToggle suit={suit} onChange={setSuit} /> : null}
      {revealed ? <p>{t("planning.revealed")}</p> : null}
      {estimate ? (
        <p>
          {t("planning.estimate")} {estimate}
        </p>
      ) : null}
      {revealed ? <ResultBanner view={view} /> : null}
      {dialog === "queue" ? (
        <QueueDrawer code={code} view={view} items={itemsOf(view)} onClose={closeDialog} />
      ) : null}
      {dialog === "settings" ? <SettingsSheet view={view} /> : null}
      {dialog === "estimate" ? <EstimateDialog code={code} view={view} onClose={closeDialog} /> : null}
      {dialog === "qr" ? (
        <div role="dialog" aria-label={t("share.qrTitle")} aria-modal="true">
          <QrCode value={`${window.location.origin}/r/${code}`} />
        </div>
      ) : null}
    </section>
  );
}
