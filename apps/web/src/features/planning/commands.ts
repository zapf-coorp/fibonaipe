import { enqueueVote, nextClientOpId } from "../../client/connection/outbox.js";
import {
  currentItem,
  isRoomView,
  roundStateOf,
  selfId,
  serverTime,
  timerSeconds,
  type RoomView,
} from "./model.js";
import { commitRoomView, mergeRoomView, readRoomView } from "./room-store.js";

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
  commitRoomView(code, {
    ...current,
    participants,
    ownVote,
    roundState: effect === "select" ? "voting-own-card" : roundStateOf(current),
  });
  void send(code, `/api/rooms/${code}/votes`, { card, suit, clientOpId: nextClientOpId() }, true);
}

export function revealRound(code: string): void {
  void send(code, `/api/rooms/${code}/reveal`, { clientOpId: nextClientOpId() }, false);
}

export function confirmEstimate(code: string, label: string): void {
  const current = readRoomView(code) ?? {};
  commitRoomView(code, { ...current, roundState: "estimated", finalEstimate: label });
  const itemId = currentItem(current)?.id ?? "item";
  void send(code, `/api/rooms/${code}/items/${itemId}/estimate`, { label, clientOpId: nextClientOpId() }, false);
}

export function addQueueItem(code: string, title: string, link: string): void {
  const current = readRoomView(code) ?? {};
  const queue = Array.isArray(current.queue) ? current.queue : [];
  commitRoomView(code, {
    ...current,
    queue: [...queue, { id: `local-${queue.length + 1}`, title, status: "pending", link, finalEstimate: null }],
  });
  void send(code, `/api/rooms/${code}/items`, { title, link, clientOpId: nextClientOpId() }, false);
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

export function startRoundTimer(code: string): void {
  const current = readRoomView(code) ?? {};
  const start = Date.parse(serverTime(current) ?? "") || Date.now();
  const endsAt = new Date(start + timerSeconds(current) * 1000).toISOString();
  commitRoomView(code, { ...current, timer: { endsAt } });
  void send(code, `/api/rooms/${code}/timer`, { clientOpId: nextClientOpId() }, false);
}

async function send(code: string, path: string, body: unknown, queueOffline: boolean): Promise<void> {
  if (queueOffline && navigator.onLine === false) {
    enqueueVote(code, body);
    return;
  }
  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return;
    const json: unknown = await response.json();
    if (isRoomView(json)) mergeRoomView(code, json);
  } catch {
    // The table keeps the optimistic view when the room is unreachable.
  }
}

export function queueSnapshot(view: RoomView): Record<string, unknown>[] {
  return Array.isArray(view.queue) ? view.queue.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") : [];
}
