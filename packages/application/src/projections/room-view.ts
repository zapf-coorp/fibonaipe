import {
  ONLINE_WINDOW_SECONDS,
  can,
  computeRoundStats,
  type Card,
  type PolicyAction,
  type PolicyActor,
  type PolicyContext,
  type Room,
  type RoundStats,
  type Suit,
  type TeamRole,
} from "@fibonaipe/domain";

const ACTIONS = [
  "manageInstance",
  "manageTeam",
  "configureSprints",
  "createTeamRoom",
  "createGuestRoom",
  "hostRoom",
  "vote",
  "revealRound",
  "setFinalEstimate",
  "manageQueue",
  "updateRoomSettings",
  "transferHost",
  "viewDashboard",
  "exportTeamData",
  "exportOwnRoomSummary",
] as const satisfies readonly PolicyAction[];

type ItemStatus = "pending" | "current" | "estimated" | "skipped" | "deferred";

interface ProjectedItem {
  readonly id: string;
  readonly status: ItemStatus;
  readonly finalEstimate: Card | null;
}

interface ProjectedRound {
  readonly id: string;
  readonly itemId: string;
  readonly number: number;
  readonly status: string;
}

interface ProjectedVote {
  readonly roundId: string;
  readonly participantId: string;
  readonly card: Card;
  readonly suit: Suit;
  readonly comment: string | null;
}

interface OwnVote {
  readonly card: Card;
  readonly suit: Suit;
  readonly comment: string | null;
}

export interface RoomView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: "guest" | "team";
  readonly teamId: string | null;
  readonly version: number;
  readonly serverTime: Date;
  readonly settings: { readonly autoReveal: boolean };
  readonly participants: readonly {
    readonly id: string;
    readonly nickname: string;
    readonly role: string;
    readonly mode: "voter" | "observer";
    readonly online: boolean;
    readonly afk: boolean;
    readonly hasVoted: boolean;
  }[];
  readonly queue: readonly { readonly id: string; readonly status: ItemStatus; readonly finalEstimate: Card | null }[];
  readonly currentItem: { readonly id: string; readonly status: ItemStatus } | null;
  readonly currentRound: { readonly id: string; readonly itemId: string; readonly number: number; readonly status: string } | null;
  readonly ownVote: OwnVote | null;
  readonly votes: readonly { readonly participantId: string; readonly card: Card; readonly suit: Suit }[] | null;
  readonly stats: RoundStats | null;
  readonly permissions: Readonly<Record<string, boolean>>;
}

type Viewer = { readonly kind: "participant"; readonly participantId: string } | { readonly kind: "screen" };

function isOnline(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() <= ONLINE_WINDOW_SECONDS * 1000;
}

function teamRoleOf(role: string): TeamRole | undefined {
  if (role === "teamAdmin" || role === "pm" || role === "po" || role === "dev" || role === "qa" || role === "observer") {
    return role;
  }
  return undefined;
}

function actorOf(room: Room, participantId: string): PolicyActor | null {
  const participant = room.participants.find((seat) => seat.id === participantId);
  if (!participant) return null;
  const seat = {
    isHost: participant.id === room.hostParticipantId,
    isFacilitator: participant.isFacilitator,
    roomMode: participant.mode,
  };
  if (room.kind === "guest") return { kind: "guest", ...seat };
  return { kind: "member", teamRole: teamRoleOf(participant.role), ...seat };
}

function contextOf(room: Room, participantId: string): PolicyContext {
  return {
    roomKind: room.kind,
    actorCreatedRoom: room.kind === "guest" && room.hostParticipantId === participantId,
  };
}

function deniedPermissions(): Record<PolicyAction, boolean> {
  return {
    manageInstance: false,
    manageTeam: false,
    configureSprints: false,
    createTeamRoom: false,
    createGuestRoom: false,
    hostRoom: false,
    vote: false,
    revealRound: false,
    setFinalEstimate: false,
    manageQueue: false,
    updateRoomSettings: false,
    transferHost: false,
    viewDashboard: false,
    exportTeamData: false,
    exportOwnRoomSummary: false,
  };
}

const permissionCache = new WeakMap<Room, Map<string, Record<PolicyAction, boolean>>>();
const rowCache = new WeakMap<object, Map<string, RoomView["participants"][number]>>();
const queueCache = new WeakMap<readonly ProjectedItem[], RoomView["queue"]>();
const currentItemCache = new WeakMap<readonly ProjectedItem[], RoomView["currentItem"]>();
const roundCache = new WeakMap<readonly ProjectedRound[], Map<string, RoomView["currentRound"]>>();
const settingsCache = new WeakMap<Room, RoomView["settings"]>();

function permissionsFor(room: Room, viewer: Viewer): Record<PolicyAction, boolean> {
  const key = viewer.kind === "screen" ? "screen" : viewer.participantId;
  let byViewer = permissionCache.get(room);
  if (!byViewer) {
    byViewer = new Map();
    permissionCache.set(room, byViewer);
  }
  const cached = byViewer.get(key);
  if (cached) return cached;
  let permissions: Record<PolicyAction, boolean>;
  if (viewer.kind === "screen") {
    permissions = deniedPermissions();
  } else {
    const actor = actorOf(room, viewer.participantId);
    if (!actor) {
      permissions = deniedPermissions();
    } else {
      const context = contextOf(room, viewer.participantId);
      permissions = deniedPermissions();
      for (const action of ACTIONS) permissions[action] = can(actor, action, context);
    }
  }
  const frozen = Object.freeze(permissions);
  byViewer.set(key, frozen);
  return frozen;
}

function participantRow(
  participant: Room["participants"][number],
  hasVoted: boolean,
  now: Date,
): RoomView["participants"][number] {
  const online = isOnline(participant.lastSeenAt, now);
  const key = `${online ? 1 : 0}${hasVoted ? 1 : 0}`;
  let rows = rowCache.get(participant);
  if (!rows) {
    rows = new Map();
    rowCache.set(participant, rows);
  }
  const cached = rows.get(key);
  if (cached) return cached;
  const row = Object.freeze({
    id: participant.id,
    nickname: participant.nickname,
    role: participant.role,
    mode: participant.mode,
    online,
    afk: participant.afk,
    hasVoted,
  });
  rows.set(key, row);
  return row;
}

function queueOf(items: readonly ProjectedItem[]): RoomView["queue"] {
  const cached = queueCache.get(items);
  if (cached) return cached;
  const queue = Object.freeze(
    items.map((item) =>
      Object.freeze({
        id: item.id,
        status: item.status,
        finalEstimate: item.finalEstimate,
      }),
    ),
  );
  queueCache.set(items, queue);
  return queue;
}

function currentItemOf(items: readonly ProjectedItem[]): RoomView["currentItem"] {
  if (currentItemCache.has(items)) return currentItemCache.get(items) ?? null;
  let current: ProjectedItem | null = null;
  for (const item of items) {
    if (item.status === "current") {
      current = item;
      break;
    }
  }
  const summary = current ? Object.freeze({ id: current.id, status: current.status }) : null;
  currentItemCache.set(items, summary);
  return summary;
}

function currentRoundOf(rounds: readonly ProjectedRound[], itemId: string): RoomView["currentRound"] {
  let byItem = roundCache.get(rounds);
  if (!byItem) {
    byItem = new Map();
    roundCache.set(rounds, byItem);
  }
  if (byItem.has(itemId)) return byItem.get(itemId) ?? null;
  const latest = latestRound(rounds, itemId);
  const summary = latest
    ? Object.freeze({ id: latest.id, itemId: latest.itemId, number: latest.number, status: latest.status })
    : null;
  byItem.set(itemId, summary);
  return summary;
}

function settingsOf(room: Room): RoomView["settings"] {
  const cached = settingsCache.get(room);
  if (cached) return cached;
  const settings = Object.freeze({ autoReveal: room.settings.autoReveal });
  settingsCache.set(room, settings);
  return settings;
}

function latestRound(rounds: readonly ProjectedRound[], itemId: string): ProjectedRound | null {
  let latest: ProjectedRound | null = null;
  for (const round of rounds) {
    if (round.itemId !== itemId) continue;
    if (!latest || round.number > latest.number) latest = round;
  }
  return latest;
}

export function projectRoomForViewer(
  room: Room,
  items: readonly ProjectedItem[],
  rounds: readonly ProjectedRound[],
  votes: readonly ProjectedVote[],
  viewer: Viewer,
  now: Date,
): RoomView {
  const currentItem = currentItemOf(items);
  const currentRound = currentItem ? currentRoundOf(rounds, currentItem.id) : null;
  const roundVotes = currentRound === null ? [] : votes.filter((vote) => vote.roundId === currentRound.id);
  const revealed = currentRound?.status === "revealed";
  let ownVote: OwnVote | null = null;
  if (viewer.kind === "participant" && currentRound) {
    const mine = roundVotes.find((vote) => vote.participantId === viewer.participantId);
    if (mine) ownVote = { card: mine.card, suit: mine.suit, comment: mine.comment };
  }
  const voted = new Set(roundVotes.map((vote) => vote.participantId));
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    kind: room.kind,
    teamId: room.teamId,
    version: room.version,
    serverTime: now,
    settings: settingsOf(room),
    participants: room.participants.map((participant) => participantRow(participant, voted.has(participant.id), now)),
    queue: queueOf(items),
    currentItem,
    currentRound,
    ownVote,
    votes: revealed
      ? roundVotes.map((vote) => ({ participantId: vote.participantId, card: vote.card, suit: vote.suit }))
      : null,
    stats: revealed ? computeRoundStats(room.scale, roundVotes) : null,
    permissions: permissionsFor(room, viewer),
  };
}
