export interface Seat {
  readonly id: string;
  readonly nickname: string;
  readonly role: string;
  readonly mode: "voter" | "observer";
  readonly online: boolean;
  readonly afk: boolean;
  readonly hasVoted: boolean;
}

export interface ItemRow {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly link: string | null;
  readonly finalEstimate: string | null;
}

export interface RoomView {
  readonly [key: string]: unknown;
}

export interface PreviewRow {
  readonly title: string;
  readonly link: string | null;
  readonly error: string | null;
}

const DEFAULT_CARDS = ["1", "2", "3", "5", "8", "13"] as const;

export function seatsOf(view: RoomView): Seat[] {
  if (!Array.isArray(view.participants)) return [];
  return view.participants.filter(isRecord).map((row) => ({
    id: typeof row.id === "string" ? row.id : "",
    nickname: typeof row.nickname === "string" ? row.nickname : "",
    role: typeof row.role === "string" ? row.role : "",
    mode: row.mode === "observer" ? "observer" : "voter",
    online: row.online !== false,
    afk: row.afk === true,
    hasVoted: row.hasVoted === true,
  }));
}

export function itemsOf(view: RoomView): ItemRow[] {
  if (!Array.isArray(view.queue)) return [];
  return view.queue.filter(isRecord).map((row) => ({
    id: typeof row.id === "string" ? row.id : "",
    title: typeof row.title === "string" ? row.title : "",
    status: typeof row.status === "string" ? row.status : "pending",
    link: typeof row.link === "string" ? row.link : null,
    finalEstimate: typeof row.finalEstimate === "string" ? row.finalEstimate : null,
  }));
}

export function activeCards(view: RoomView): readonly string[] {
  const settings = record(view.settings);
  if (Array.isArray(settings?.activeCards) && settings.activeCards.every((card) => typeof card === "string")) {
    return settings.activeCards;
  }
  return DEFAULT_CARDS;
}

export function can(view: RoomView, key: string): boolean {
  const permissions = record(view.permissions);
  if (!permissions) return key === "vote";
  return permissions[key] === true;
}

export function roundStateOf(view: RoomView): string {
  return typeof view.roundState === "string" ? view.roundState : "voting-empty";
}

export function roundStatus(view: RoomView): string | null {
  const round = record(view.currentRound);
  return round && typeof round.status === "string" ? round.status : null;
}

export function selfId(view: RoomView): string | null {
  const viewer = record(view.viewer);
  if (!viewer || viewer.kind === "screen") return null;
  return typeof viewer.participantId === "string" ? viewer.participantId : null;
}

export function ownCard(view: RoomView): string | null {
  const vote = record(view.ownVote);
  if (!vote) return null;
  if (typeof vote.card === "string") return vote.card;
  const card = record(vote.card);
  return card && typeof card.label === "string" ? card.label : null;
}

export function ownComment(view: RoomView): string | null {
  const vote = record(view.ownVote);
  return vote && typeof vote.comment === "string" && vote.comment.length > 0 ? vote.comment : null;
}

export function suitAxisOn(view: RoomView): boolean {
  const settings = record(view.settings);
  if (!settings || !("suitAxisEnabled" in settings)) return true;
  return settings.suitAxisEnabled !== false;
}

export function showAverage(view: RoomView): boolean {
  const settings = record(view.settings);
  if (settings && "showAverage" in settings) return settings.showAverage !== false;
  return true;
}

export function serverTime(view: RoomView): string | null {
  return typeof view.serverTime === "string" ? view.serverTime : null;
}

export function timerEndsAt(view: RoomView): string | null {
  const timer = record(view.timer);
  return timer && typeof timer.endsAt === "string" ? timer.endsAt : null;
}

export function timerSeconds(view: RoomView): number {
  const settings = record(view.settings);
  return settings && typeof settings.timerSeconds === "number" ? settings.timerSeconds : 60;
}

export function finalEstimate(view: RoomView): string | null {
  return typeof view.finalEstimate === "string" ? view.finalEstimate : null;
}

export function currentItem(view: RoomView): ItemRow | null {
  const items = itemsOf(view);
  return items.find((item) => item.status === "current") ?? items[0] ?? null;
}

export function statsOf(view: RoomView): Record<string, unknown> | null {
  return record(view.stats);
}

export function isHttp(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function previewRows(raw: string): PreviewRow[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(";");
      const title = cells[0]?.trim() ?? "";
      const link = cells.length >= 3 ? (cells[2]?.trim() ?? "") : "";
      if (link && !isHttp(link)) return { title, link, error: "Link inválido: somente http(s)." };
      return { title, link: link || null, error: null };
    });
}

export function isRoomView(value: unknown): value is RoomView {
  if (!value || typeof value !== "object") return false;
  return "participants" in value || "roundState" in value || "queue" in value || "viewer" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
