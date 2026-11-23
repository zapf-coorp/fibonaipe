import { beginErrorFlash, showErrorFlash } from "../../client/error-flash.js";
import { messageKeyFor } from "../../client/i18n/error-keys.js";
import { t } from "../../client/i18n/index.js";
import { enqueueVote, nextClientOpId } from "../../client/connection/outbox.js";
import {
  currentItem,
  isRoomView,
  roundStateOf,
  roundStatus,
  selfId,
  serverTime,
  timerSeconds,
  type RoomView,
} from "./model.js";
import {
  clearTimerFault,
  clearVoteFault,
  commitRoomView,
  markTimerFailed,
  markVoteFailed,
  mergeRoomView,
  readRoomView,
  refreshRoom,
  setRoomError,
} from "./room-store.js";

export function castVote(code: string, card: string, suit: string, effect: "select" | "return"): void {
  const current = readRoomView(code) ?? {};
  const mine = selfId(current);
  const participants = Array.isArray(current.participants)
    ? current.participants.map((row) => {
        if (!row || typeof row !== "object" || (row as { id?: string }).id !== mine) return row;
        if (effect === "return") return { ...row, afk: false };
        return { ...row, hasVoted: true };
      })
    : current.participants;
  const ownVote =
    effect === "select"
      ? {
          ...(current.ownVote && typeof current.ownVote === "object" ? current.ownVote : {}),
          card,
          suit,
        }
      : current.ownVote;
  const state = roundStateOf(current);
  const roundState = effect === "select" && state !== "revealed" && state !== "estimated" ? "voting-own-card" : state;
  commitRoomView(code, {
    ...current,
    participants,
    ownVote,
    roundState,
  });
  void send(code, `/api/rooms/${code}/votes`, { card, suit, clientOpId: nextClientOpId() }, true, "POST", "vote", card);
}

export function retractOwnVote(code: string): void {
  const current = readRoomView(code) ?? {};
  const mine = selfId(current);
  const participants = Array.isArray(current.participants)
    ? current.participants.map((row) => {
        if (!row || typeof row !== "object" || (row as { id?: string }).id !== mine) return row;
        return { ...row, hasVoted: false };
      })
    : current.participants;
  const state = roundStateOf(current);
  const roundState = state === "revealed" || state === "estimated" ? state : "voting-empty";
  commitRoomView(code, {
    ...current,
    participants,
    ownVote: null,
    roundState,
  });
  void send(code, `/api/rooms/${code}/votes`, { clientOpId: nextClientOpId() }, false, "DELETE");
}

export function revealRound(code: string): void {
  const current = readRoomView(code);
  if (roundStatus(current ?? {}) !== "voting") {
    setRoomError(t("planning.needRound"));
    return;
  }
  setRoomError(null);
  void send(code, `/api/rooms/${code}/reveal`, { clientOpId: nextClientOpId() }, false);
}

export function confirmEstimate(code: string, label: string): void {
  const current = readRoomView(code) ?? {};
  commitRoomView(code, { ...current, roundState: "estimated", finalEstimate: label });
  const itemId = currentItem(current)?.id ?? "item";
  void send(code, `/api/rooms/${code}/items/${itemId}/estimate`, { label, clientOpId: nextClientOpId() }, false);
}

let localItemSerial = 0;

function localItemId(): string {
  localItemSerial += 1;
  return `local-${Date.now().toString(36)}-${localItemSerial}`;
}

export function addQueueItem(code: string, title: string, link: string): void {
  const current = readRoomView(code) ?? {};
  const queue = Array.isArray(current.queue) ? current.queue : [];
  commitRoomView(code, {
    ...current,
    queue: [...queue, { id: localItemId(), title, status: "pending", link: link.length > 0 ? link : null, finalEstimate: null }],
  });
  void send(code, `/api/rooms/${code}/items`, { title, link, clientOpId: nextClientOpId() }, false);
}

export function addQueueItems(code: string, rows: readonly { readonly title: string; readonly link: string }[]): void {
  if (rows.length === 0) return;
  const current = readRoomView(code) ?? {};
  const queue = Array.isArray(current.queue) ? current.queue : [];
  const added = rows.map((row) => ({
    id: localItemId(),
    title: row.title,
    status: "pending",
    link: row.link.length > 0 ? row.link : null,
    finalEstimate: null,
  }));
  commitRoomView(code, { ...current, queue: [...queue, ...added] });
  void send(
    code,
    `/api/rooms/${code}/items/import`,
    {
      clientOpId: nextClientOpId(),
      source: { kind: "csv", csvContent: rowsToCsv(rows) },
    },
    false,
  );
}

function rowsToCsv(rows: readonly { readonly title: string; readonly link: string }[]): string {
  return ["title,link", ...rows.map((row) => `${csvCell(row.title)},${csvCell(row.link)}`)].join("\n");
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function removeQueueItem(code: string, itemId: string): void {
  const current = readRoomView(code) ?? {};
  const queue = Array.isArray(current.queue)
    ? current.queue.filter((row) => !row || typeof row !== "object" || (row as { id?: string }).id !== itemId)
    : [];
  commitRoomView(code, { ...current, queue });
  void send(code, `/api/rooms/${code}/items/${itemId}/remove`, { clientOpId: nextClientOpId() }, false);
}

export async function importQueue(code: string, rawText: string): Promise<void> {
  await send(
    code,
    `/api/rooms/${code}/items/import`,
    { clientOpId: nextClientOpId(), source: { kind: "text", rawText } },
    false,
  );
}

export function reorderQueue(code: string, queue: readonly Record<string, unknown>[]): void {
  const current = readRoomView(code) ?? {};
  commitRoomView(code, { ...current, queue });
  void send(code, `/api/rooms/${code}/items/reorder`, {
    itemIds: queue.map((item) => String(item.id)),
    clientOpId: nextClientOpId(),
  }, false);
}

/** Opens an unvoted item for voting. Any other open item goes back to pending. */
export function selectItem(code: string, itemId: string): void {
  const current = readRoomView(code) ?? {};
  const queue = queueSnapshot(current).map((row) => {
    if (row.id === itemId) return { ...row, status: "current" };
    return row.status === "current" ? { ...row, status: "pending" } : row;
  });
  commitRoomView(code, { ...current, queue });
  void send(code, `/api/rooms/${code}/items/${itemId}/current`, { clientOpId: nextClientOpId() }, false);
}

/** Starts a new round on an item that was already voted. */
export function reopenItem(code: string, itemId: string): void {
  void send(code, `/api/rooms/${code}/rounds`, { itemId, clientOpId: nextClientOpId() }, false);
}

export function startRoundTimer(code: string): void {
  const current = readRoomView(code) ?? {};
  const item = currentItem(current);
  if (!item) {
    markTimerFailed();
    setRoomError(t("planning.needRound"));
    return;
  }
  void send(code, `/api/rooms/${code}/voting`, { itemId: item.id, clientOpId: nextClientOpId() }, false, "POST", "timer");
}

type CommandFault = "vote" | "timer" | null;

async function send(
  code: string,
  path: string,
  body: unknown,
  queueOffline: boolean,
  method = "POST",
  fault: CommandFault = null,
  voteCard?: string,
): Promise<void> {
  const flash = beginErrorFlash();
  if (queueOffline && navigator.onLine === false) {
    enqueueVote(code, body);
    return;
  }
  try {
    const response = await fetch(path, {
      method,
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const json: unknown = await response.json().catch(() => null);
      const error = json && typeof json === "object" && "error" in json ? json.error : null;
      const codeName = error && typeof error === "object" && "code" in error ? error.code : null;
      noteFault(fault, voteCard);
      setRoomError(faultText(fault, typeof codeName === "string" ? codeName : "VALIDATION"));
      showErrorFlash(flash);
      return;
    }
    const json: unknown = await response.json();
    if (isRoomView(json)) mergeRoomView(code, json);
    else await refreshRoom(code);
    if (fault === "timer") stampTimer(code);
    clearFault(fault);
    setRoomError(null);
  } catch {
    noteFault(fault, voteCard);
    setRoomError(faultText(fault, "SERVICE_UNAVAILABLE"));
    showErrorFlash(flash);
  }
}

function faultText(fault: CommandFault, codeName: string): string {
  if (fault === "vote") return t("planning.voteError");
  if (fault === "timer") return t("planning.timerError");
  return t(messageKeyFor(codeName));
}

function noteFault(fault: CommandFault, voteCard: string | undefined): void {
  if (fault === "vote" && voteCard) markVoteFailed(voteCard);
  if (fault === "timer") markTimerFailed();
}

function clearFault(fault: CommandFault): void {
  if (fault === "vote") clearVoteFault();
  if (fault === "timer") clearTimerFault();
}

/** The round endpoint does not return a clock, so a successful start paints one locally. */
function stampTimer(code: string): void {
  const current = readRoomView(code) ?? {};
  if (typeof current.timer === "object" && current.timer && "endsAt" in current.timer) return;
  const start = Date.parse(serverTime(current) ?? "") || Date.now();
  const endsAt = new Date(start + timerSeconds(current) * 1000).toISOString();
  commitRoomView(code, { ...current, timer: { endsAt } });
}

export function queueSnapshot(view: RoomView): Record<string, unknown>[] {
  return Array.isArray(view.queue) ? view.queue.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") : [];
}
