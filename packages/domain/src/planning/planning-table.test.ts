import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, it, beforeAll } from "vitest";
import type { AppError } from "../shared/app-error.js";
import {
  MAX_ITEM_DESC_LENGTH,
  MAX_ITEM_TITLE_LENGTH,
  MAX_ITEMS_PER_ROOM,
  MAX_VOTE_COMMENT_LENGTH,
  ONLINE_WINDOW_SECONDS,
} from "../shared/constants.js";
import { ItemId, ParticipantId, RoomCode, RoomId, RoundId, TeamId } from "../shared/ids.js";
import type { Result } from "../shared/result.js";
import { can, type PolicyAction, type PolicyActor, type PolicyContext } from "../policy/can.js";
import type { Card } from "../scales/card.js";
import { ScaleBuilder } from "../scales/scale-builder.js";
import type { Scale } from "../scales/scale.js";
import { Suit } from "../scales/suit.js";
import { computeRoundStats, type RoundStats } from "../stats/compute-round-stats.js";
import { RoomBuilder } from "../room/room-builder.js";
import { RoomSettingsBuilder } from "../room/room-settings-builder.js";
import type { Room } from "../room/room.js";

const EPOCH = Date.UTC(2026, 0, 1, 12, 0, 0);
const NOW = new Date(EPOCH + 100 * 1000);
const CARD_LABELS = ["0", "½", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "Coringa", "AFK"] as const;
const SUIT_KINDS = ["clubs", "hearts", "spades", "diamonds", "joker"] as const;
const ACTIONS: readonly PolicyAction[] = [
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
];

type ItemStatus = "pending" | "current" | "estimated" | "skipped" | "deferred";
type Reach = "pending" | "current-voting" | "current-revealed" | "skipped" | "deferred" | "estimated";
type Command = "to-pending" | "to-current" | "to-estimated" | "to-skipped" | "to-deferred" | "new-round";
type ModuleShape = Record<string, unknown>;

interface ItemView {
  readonly id: string;
  readonly roomId: string;
  readonly teamId: string | null;
  readonly title: string;
  readonly description: string;
  readonly externalUrl: string | null;
  readonly externalKey: string | null;
  readonly position: number;
  readonly status: ItemStatus;
  readonly figureTag: string | null;
  readonly finalEstimate: Card | null;
  readonly finalSuit: string | null;
}

interface RoundView {
  readonly id: string;
  readonly roomId: string;
  readonly itemId: string;
  readonly number: number;
  readonly status: "voting" | "revealed";
  readonly timerEndsAt: Date | null;
  readonly stats: RoundStats | null;
}

interface VoteView {
  readonly roundId: string;
  readonly participantId: string;
  readonly card: Card;
  readonly suit: Suit;
  readonly comment: string | null;
}

interface AuditView {
  readonly itemId: string;
  readonly changedBy: string;
  readonly at: Date;
  readonly from: string;
  readonly to: string;
}

interface PlanningEvent {
  readonly type: string;
  readonly roomId: string;
  readonly version: number;
  readonly at: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

interface TableOk {
  readonly table: PlanningTable;
  readonly events: readonly PlanningEvent[];
  readonly audit: AuditView | null;
}

interface PlanningTable {
  readonly room: Room;
  readonly items: readonly ItemView[];
  readonly rounds: readonly RoundView[];
  readonly votes: readonly VoteView[];
  addItem(input: { actorParticipantId: string; item: ItemView; now: Date }): Result<TableOk, AppError>;
  setCurrent(input: { actorParticipantId: string; itemId: string; roundId: string; now: Date }): Result<TableOk, AppError>;
  returnToPending(input: { actorParticipantId: string; itemId: string; now: Date }): Result<TableOk, AppError>;
  skip(input: { actorParticipantId: string; itemId: string; now: Date }): Result<TableOk, AppError>;
  defer(input: { actorParticipantId: string; itemId: string; now: Date }): Result<TableOk, AppError>;
  reorder(input: { actorParticipantId: string; itemIds: readonly string[]; now: Date }): Result<TableOk, AppError>;
  castVote(input: {
    participantId: string;
    card: string;
    suit?: string | null;
    comment?: string | null;
    now: Date;
  }): Result<TableOk, AppError>;
  retractVote(input: { participantId: string; now: Date }): Result<TableOk, AppError>;
  reveal(input: { actorParticipantId: string; now: Date }): Result<TableOk, AppError>;
  newRound(input: { actorParticipantId: string; itemId: string; roundId: string; now: Date }): Result<TableOk, AppError>;
  setFinalEstimate(input: {
    actorParticipantId: string;
    itemId: string;
    label: string;
    suit?: string | null;
    now: Date;
  }): Result<TableOk, AppError>;
  startTimer(input: { actorParticipantId: string; endsAt: Date; now: Date }): Result<TableOk, AppError>;
  stopTimer(input: { actorParticipantId: string; now: Date }): Result<TableOk, AppError>;
  shouldAutoReveal(now: Date): boolean;
}

interface PlanningTableApi {
  open(room: Room): Result<PlanningTable, AppError>;
  rehydrate(input: {
    room: Room;
    items: readonly ItemView[];
    rounds: readonly RoundView[];
    votes: readonly VoteView[];
  }): Result<PlanningTable, AppError>;
}

interface ItemBuilderChain {
  withId(id: string): this;
  withRoomId(id: string): this;
  withTeamId(id: string | null): this;
  withTitle(title: string): this;
  withDescription(description: string): this;
  withExternalUrl(url: string | null): this;
  withExternalKey(key: string | null): this;
  withPosition(position: number): this;
  withFigureTag(tag: string | null): this;
  withStatus(status: ItemStatus): this;
  build(): Result<ItemView, AppError>;
}

interface RoundApi {
  rehydrate(input: {
    id: string;
    roomId: string;
    itemId: string;
    number: number;
    status: "voting" | "revealed";
    timerEndsAt: Date | null;
    stats: RoundStats | null;
  }): Result<RoundView, AppError>;
}

interface VoteApi {
  rehydrate(input: {
    roundId: string;
    participantId: string;
    card: Card;
    suit: Suit;
    comment: string | null;
  }): Result<VoteView, AppError>;
}

interface OwnVote {
  readonly card: Card;
  readonly suit: Suit;
  readonly comment: string | null;
}

interface RoomView {
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
type ProjectRoom = (
  room: Room,
  items: readonly ItemView[],
  rounds: readonly RoundView[],
  votes: readonly VoteView[],
  viewer: Viewer,
  now: Date,
) => RoomView;

function at(seconds: number): Date {
  return new Date(EPOCH + seconds * 1000);
}

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function code(result: Result<unknown, AppError>): string {
  return result.ok ? "OK" : result.error.code;
}

function branded<T extends string>(factory: { create(raw: string): Result<T, AppError> }, raw: string): T {
  return must(factory.create(raw));
}

const scale = must(ScaleBuilder.fibonacci().withId("fibonacci").withName("Fibonacci").build());
const HOST = branded(ParticipantId, "host");
const VOTER_A = branded(ParticipantId, "voter-a");
const VOTER_B = branded(ParticipantId, "voter-b");
const ROOM = branded(RoomId, "room-1");
const CODE = branded(RoomCode, "23456789");
const ITEM_A = branded(ItemId, "item-a");
const ITEM_B = branded(ItemId, "item-b");
const ROUND_A1 = branded(RoundId, "round-a1");
const ROUND_A2 = branded(RoundId, "round-a2");
const ROUND_B1 = branded(RoundId, "round-b1");
const TEAM = branded(TeamId, "team-1");

let PlanningTable: PlanningTableApi;
let ItemBuilder: new () => ItemBuilderChain;
let Round: RoundApi;
let Vote: VoteApi;
let EstimateAudit: new (...args: never[]) => AuditView;
let projectRoomForViewer: ProjectRoom;
let loadingPlanning: Promise<void> | undefined;

function asModule(value: unknown): ModuleShape {
  return value as ModuleShape;
}

function requireFn(mod: ModuleShape, name: string): unknown {
  const value = mod[name];
  if (typeof value !== "function") throw new Error(`${name} is not a function`);
  return value;
}

function loadPlanning(): Promise<void> {
  loadingPlanning ??= (async () => {
    const tableMod = asModule(await import("./planning-table.js"));
    const itemMod = asModule(await import("./item.js"));
    const roundMod = asModule(await import("./round.js"));
    const voteMod = asModule(await import("./vote.js"));
    const auditMod = asModule(await import("./estimate-audit.js"));
    PlanningTable = requireFn(tableMod, "PlanningTable") as PlanningTableApi;
    ItemBuilder = requireFn(itemMod, "ItemBuilder") as new () => ItemBuilderChain;
    requireFn(itemMod, "Item");
    Round = requireFn(roundMod, "Round") as RoundApi;
    Vote = requireFn(voteMod, "Vote") as VoteApi;
    EstimateAudit = requireFn(auditMod, "EstimateAudit") as abstract new (...args: never[]) => AuditView;
    if (typeof PlanningTable.open !== "function" || typeof PlanningTable.rehydrate !== "function") {
      throw new Error("PlanningTable.open and PlanningTable.rehydrate are required");
    }
    if (typeof Round.rehydrate !== "function" || typeof Vote.rehydrate !== "function") {
      throw new Error("Round.rehydrate and Vote.rehydrate are required");
    }
  })();
  return loadingPlanning;
}

async function loadProjector(): Promise<void> {
  await loadPlanning();
  const projectorMod = asModule(await import("../../../application/src/projections/room-view.js"));
  projectRoomForViewer = requireFn(projectorMod, "projectRoomForViewer") as ProjectRoom;
}

function deckCard(label: string): Card {
  const found = scale.cards.find((card) => card.label === label);
  if (!found) throw new Error(`missing card ${label}`);
  return found;
}

function buildItem(input?: {
  id?: string;
  roomId?: string;
  teamId?: string | null;
  title?: string;
  description?: string;
  externalUrl?: string | null;
  externalKey?: string | null;
  position?: number;
  figureTag?: string | null;
  status?: ItemStatus;
}): Result<ItemView, AppError> {
  return new ItemBuilder()
    .withId(input?.id ?? ITEM_A)
    .withRoomId(input?.roomId ?? ROOM)
    .withTeamId(input?.teamId ?? null)
    .withTitle(input?.title ?? "Alpha")
    .withDescription(input?.description ?? "")
    .withExternalUrl(input?.externalUrl === undefined ? null : input.externalUrl)
    .withExternalKey(input?.externalKey === undefined ? null : input.externalKey)
    .withPosition(input?.position ?? 0)
    .withFigureTag(input?.figureTag === undefined ? null : input.figureTag)
    .withStatus(input?.status ?? "pending")
    .build();
}

function makeRoom(input?: {
  autoReveal?: boolean;
  version?: number;
  hostMode?: "voter" | "observer";
  hostAfk?: boolean;
  kind?: "guest" | "team";
  teamId?: string | null;
  activeScale?: Scale;
  seenAt?: Date;
}): Room {
  const kind = input?.kind ?? "guest";
  const activeScale = input?.activeScale ?? scale;
  const seenAt = input?.seenAt ?? NOW;
  const settings = must(
    new RoomSettingsBuilder().withActiveScaleId(activeScale.id).withAutoReveal(input?.autoReveal ?? false).build(),
  );
  return must(
    new RoomBuilder()
      .withId(ROOM)
      .withCode(CODE)
      .withName("Planning")
      .withKind(kind)
      .withTeamId(kind === "team" ? (input?.teamId ?? TEAM) : null)
      .withScale(activeScale)
      .withSettings(settings)
      .withHost({
        id: HOST,
        nickname: "Host",
        role: kind === "team" ? "pm" : "dev",
        mode: input?.hostMode ?? "voter",
        guestSessionId: "session-host",
        joinedAt: seenAt,
        lastSeenAt: seenAt,
        afk: input?.hostAfk ?? false,
        isFacilitator: false,
      })
      .withNow(seenAt)
      .withVersion(input?.version ?? 1)
      .build(),
  );
}

function withSeats(
  room: Room,
  seats: readonly {
    id: string;
    nickname: string;
    role: string;
    mode?: "voter" | "observer";
    afk?: boolean;
    isFacilitator?: boolean;
    seenAt?: Date;
  }[],
): Room {
  let next = room;
  for (const seat of seats) {
    const joined = must(
      next.join({
        participantId: branded(ParticipantId, seat.id),
        nickname: seat.nickname,
        role: seat.role,
        mode: seat.mode ?? "voter",
        guestSessionId: `session-${seat.id}`,
        now: seat.seenAt ?? NOW,
        afk: seat.afk ?? false,
        isFacilitator: seat.isFacilitator ?? false,
      }),
    );
    next = joined.room;
  }
  return next;
}

function standardRoom(version = 1): Room {
  return withSeats(makeRoom({ version }), [
    { id: "voter-a", nickname: "Ada", role: "dev" },
    { id: "voter-b", nickname: "Bea", role: "qa" },
  ]);
}

function apply(result: Result<TableOk, AppError>): TableOk {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function open(room: Room): PlanningTable {
  return must(PlanningTable.open(room));
}

function itemOf(table: PlanningTable, id: string): ItemView {
  const found = table.items.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing item ${id}`);
  return found;
}

function roundOf(table: PlanningTable, id: string): RoundView {
  const found = table.rounds.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing round ${id}`);
  return found;
}

function votesFor(table: PlanningTable, roundId: string): readonly VoteView[] {
  return table.votes.filter((vote) => vote.roundId === roundId);
}

function snapshot(table: PlanningTable) {
  return {
    version: table.room.version,
    items: table.items.map((entry) => ({
      id: entry.id,
      status: entry.status,
      position: entry.position,
      title: entry.title,
      final: entry.finalEstimate?.label ?? null,
      suit: entry.finalSuit,
    })),
    rounds: table.rounds.map((entry) => ({
      id: entry.id,
      itemId: entry.itemId,
      number: entry.number,
      status: entry.status,
      timer: entry.timerEndsAt ? entry.timerEndsAt.getTime() : null,
      voteCount: entry.stats ? entry.stats.voteCount : null,
    })),
    votes: table.votes.map((entry) => ({
      roundId: entry.roundId,
      participantId: entry.participantId,
      label: entry.card.label,
      suit: entry.suit.kind,
      comment: entry.comment,
    })),
  };
}

function expectUnchanged(table: PlanningTable, before: ReturnType<typeof snapshot>) {
  expect(snapshot(table)).toEqual(before);
}

function expectEnvelope(event: PlanningEvent, room: Room, type: string, now: Date, payload: Record<string, unknown>) {
  expect(Object.keys(event).sort()).toEqual(["at", "payload", "roomId", "type", "version"]);
  expect(event.type).toBe(type);
  expect(event.roomId).toBe(room.id);
  expect(event.version).toBe(room.version);
  expect(event.at).toBe(now.toISOString());
  expect(event.payload).toEqual(payload);
  expect(Object.isFrozen(event)).toBe(true);
  expect(Object.isFrozen(event.payload)).toBe(true);
  for (const key of Object.keys(event.payload)) {
    expect(["card", "suit", "comment", "vote", "votes", "label", "numeric"]).not.toContain(key);
  }
}

function eventTypes(events: readonly PlanningEvent[]): string[] {
  return events.map((event) => event.type).sort();
}

function currentTable(room: Room = standardRoom()): PlanningTable {
  let table = open(room);
  table = apply(table.addItem({ actorParticipantId: HOST, item: must(buildItem()), now: NOW })).table;
  return apply(table.setCurrent({ actorParticipantId: HOST, itemId: ITEM_A, roundId: ROUND_A1, now: NOW })).table;
}

function reach(kind: Reach): PlanningTable {
  if (kind === "pending") {
    const table = open(standardRoom());
    return apply(table.addItem({ actorParticipantId: HOST, item: must(buildItem()), now: NOW })).table;
  }
  let table = currentTable();
  if (kind === "current-voting") return table;
  if (kind === "skipped") {
    return apply(table.skip({ actorParticipantId: HOST, itemId: ITEM_A, now: NOW })).table;
  }
  if (kind === "deferred") {
    return apply(table.defer({ actorParticipantId: HOST, itemId: ITEM_A, now: NOW })).table;
  }
  table = apply(table.reveal({ actorParticipantId: HOST, now: NOW })).table;
  if (kind === "current-revealed") return table;
  return apply(table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "5", now: NOW })).table;
}

function runCommand(table: PlanningTable, command: Command): Result<TableOk, AppError> {
  const actorParticipantId = HOST;
  const now = NOW;
  if (command === "to-pending") return table.returnToPending({ actorParticipantId, itemId: ITEM_A, now });
  if (command === "to-current") {
    return table.setCurrent({ actorParticipantId, itemId: ITEM_A, roundId: branded(RoundId, "round-edge"), now });
  }
  if (command === "to-estimated") return table.setFinalEstimate({ actorParticipantId, itemId: ITEM_A, label: "8", now });
  if (command === "to-skipped") return table.skip({ actorParticipantId, itemId: ITEM_A, now });
  if (command === "to-deferred") return table.defer({ actorParticipantId, itemId: ITEM_A, now });
  return table.newRound({ actorParticipantId, itemId: ITEM_A, roundId: branded(RoundId, "round-edge"), now });
}

function sourceStatus(from: Reach): ItemStatus {
  if (from === "pending") return "pending";
  if (from === "skipped") return "skipped";
  if (from === "deferred") return "deferred";
  if (from === "estimated") return "estimated";
  return "current";
}

function targetStatus(command: Command): ItemStatus {
  if (command === "to-pending") return "pending";
  if (command === "to-skipped") return "skipped";
  if (command === "to-deferred") return "deferred";
  if (command === "to-estimated") return "estimated";
  return "current";
}

const LEGAL_EDGES = new Set([
  "pending|to-current",
  "current-voting|to-skipped",
  "current-voting|to-deferred",
  "current-revealed|to-estimated",
  "current-revealed|to-skipped",
  "current-revealed|to-deferred",
  "current-revealed|new-round",
  "skipped|to-pending",
  "skipped|to-current",
  "deferred|to-pending",
  "deferred|to-current",
  "estimated|to-estimated",
  "estimated|new-round",
]);

const SOURCES: readonly Reach[] = ["pending", "current-voting", "current-revealed", "skipped", "deferred", "estimated"];
const COMMANDS: readonly Command[] = ["to-pending", "to-current", "to-estimated", "to-skipped", "to-deferred", "new-round"];
const EDGES: readonly (readonly [Reach, Command, "OK" | "VALIDATION", ItemStatus])[] = SOURCES.flatMap((from) =>
  COMMANDS.map((command) => {
    const ok = LEGAL_EDGES.has(`${from}|${command}`);
    const status = ok ? targetStatus(command) : sourceStatus(from);
    return [from, command, ok ? "OK" : "VALIDATION", status] as const;
  }),
);

function permissionsFor(actor: PolicyActor, ctx: PolicyContext): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  for (const action of ACTIONS) permissions[action] = can(actor, action, ctx);
  return permissions;
}

function allDenied(): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  for (const action of ACTIONS) permissions[action] = false;
  return permissions;
}

function project(table: PlanningTable, viewer: Viewer, now: Date = NOW): RoomView {
  return projectRoomForViewer(table.room, table.items, table.rounds, table.votes, viewer, now);
}

function stripOwnVote(view: RoomView): RoomView {
  return { ...view, ownVote: null };
}

function keysOf(value: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      found.push(key);
      walk(child);
    }
  };
  walk(value);
  return found;
}

function stringsOf(value: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const child of Object.values(node)) walk(child);
  };
  walk(value);
  return found;
}

function flipCard(label: string): string {
  const index = CARD_LABELS.indexOf(label as (typeof CARD_LABELS)[number]);
  return CARD_LABELS[(index + 1) % CARD_LABELS.length] ?? "5";
}

function flipSuit(kind: string): string {
  const index = SUIT_KINDS.indexOf(kind as (typeof SUIT_KINDS)[number]);
  return SUIT_KINDS[(index + 1) % SUIT_KINDS.length] ?? "clubs";
}

const here = dirname(fileURLToPath(import.meta.url));
const PURE_FILES = [
  join(here, "item.ts"),
  join(here, "round.ts"),
  join(here, "vote.ts"),
  join(here, "estimate-audit.ts"),
  join(here, "planning-table.ts"),
  join(here, "../../../application/src/projections/room-view.ts"),
];

describe("planning sources stay free of clocks and randomness", () => {
  it("rejects Date.now, new Date, Math.random, and process.env in the planning modules", () => {
    const problems: string[] = [];
    for (const file of PURE_FILES) {
      if (!existsSync(file)) {
        problems.push(`missing ${file}`);
        continue;
      }
      const source = readFileSync(file, "utf8");
      if (/Date\.now\s*\(/.test(source)) problems.push(`Date.now ${file}`);
      if (/new\s+Date\s*\(/.test(source)) problems.push(`new Date ${file}`);
      if (/Math\.random\s*\(/.test(source)) problems.push(`Math.random ${file}`);
      if (source.includes("process.env")) problems.push(`process.env ${file}`);
      if (/crypto\.randomUUID\s*\(/.test(source)) problems.push(`crypto.randomUUID ${file}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});

describe("Item, Round, and Vote", () => {
  beforeAll(async () => {
    await loadPlanning();
  });

  describe("ItemBuilder", () => {
    it("stores a 1..200 title, a 0..2000 description, an http(s) URL, and a figure tag", () => {
      expect(MAX_ITEM_TITLE_LENGTH).toBe(200);
      expect(MAX_ITEM_DESC_LENGTH).toBe(2000);
      const built = must(
        buildItem({
          title: "A".repeat(200),
          description: "D".repeat(2000),
          externalUrl: "https://example.com/a",
          externalKey: "FIB-1",
          figureTag: "Q",
        }),
      );
      expect(built.title).toBe("A".repeat(200));
      expect(built.description).toBe("D".repeat(2000));
      expect(built.externalUrl).toBe("https://example.com/a");
      expect(built.externalKey).toBe("FIB-1");
      expect(built.figureTag).toBe("Q");
      expect(built.status).toBe("pending");
      expect(built.finalEstimate).toBeNull();
      expect(built.finalSuit).toBeNull();
      expect(Object.isFrozen(built)).toBe(true);
      expect(code(buildItem({ title: "A", externalUrl: "http://example.com/a" }))).toBe("OK");
    });

    it("rejects an empty title, a title over 200, a description over 2000, a bad figure tag, and a bad position", () => {
      expect(code(buildItem({ title: "" }))).toBe("VALIDATION");
      expect(code(buildItem({ title: "A".repeat(201) }))).toBe("VALIDATION");
      expect(code(buildItem({ description: "D".repeat(2001) }))).toBe("VALIDATION");
      expect(code(buildItem({ figureTag: "j" }))).toBe("VALIDATION");
      expect(code(buildItem({ figureTag: "10" }))).toBe("VALIDATION");
      expect(code(buildItem({ position: -1 }))).toBe("VALIDATION");
      expect(code(buildItem({ position: 1.5 }))).toBe("VALIDATION");
    });

    it.each(["javascript:alert(1)", "JavaScript:alert(1)", "ftp://example.com/a", "data:text/plain,hi", "example.com"])(
      "rejects URL %s",
      (externalUrl) => {
        expect(code(buildItem({ externalUrl }))).toBe("VALIDATION");
      },
    );

    it.each(["A", "K", "Q", "J"])("accepts figure tag %s", (figureTag) => {
      expect(must(buildItem({ figureTag })).figureTag).toBe(figureTag);
    });
  });

  describe("item status machine", () => {
    it.each(EDGES)("%s %s => %s (%s)", (from, command, expected, status) => {
      const table = reach(from);
      const before = snapshot(table);
      const result = runCommand(table, command);
      expect(code(result)).toBe(expected);
      expectUnchanged(table, before);
      if (expected === "OK") {
        if (!result.ok) throw new Error(expected);
        expect(itemOf(result.value.table, ITEM_A).status).toBe(status);
        expect(result.value.table.room.version).toBe(table.room.version);
      } else {
        expect(itemOf(table, ITEM_A).status).toBe(status);
      }
    });

    it("reuses the voting round when a skipped item returns to current", () => {
      let table = currentTable();
      table = apply(
        table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", comment: "kept", now: NOW }),
      ).table;
      table = apply(table.skip({ actorParticipantId: HOST, itemId: ITEM_A, now: NOW })).table;
      const next = apply(
        table.setCurrent({ actorParticipantId: HOST, itemId: ITEM_A, roundId: branded(RoundId, "round-edge"), now: NOW }),
      ).table;
      expect(itemOf(next, ITEM_A).status).toBe("current");
      expect(next.rounds.map((round) => round.id)).toEqual([ROUND_A1]);
      expect(roundOf(next, ROUND_A1).status).toBe("voting");
      expect(votesFor(next, ROUND_A1).map((vote) => vote.card.label)).toEqual(["5"]);
    });

    it("opens round n+1 when a revealed item is skipped and then made current again", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", now: NOW })).table;
      table = apply(table.reveal({ actorParticipantId: HOST, now: NOW })).table;
      table = apply(table.skip({ actorParticipantId: HOST, itemId: ITEM_A, now: NOW })).table;
      const before = snapshot(table);
      const blocked = table.newRound({ actorParticipantId: HOST, itemId: ITEM_A, roundId: ROUND_A2, now: NOW });
      expect(code(blocked)).toBe("VALIDATION");
      expectUnchanged(table, before);
      const next = apply(table.setCurrent({ actorParticipantId: HOST, itemId: ITEM_A, roundId: ROUND_A2, now: NOW })).table;
      expect(itemOf(next, ITEM_A).status).toBe("current");
      expect(roundOf(next, ROUND_A1).status).toBe("revealed");
      expect(votesFor(next, ROUND_A1)).toHaveLength(1);
      expect(roundOf(next, ROUND_A2)).toMatchObject({ number: 2, status: "voting", itemId: ITEM_A, stats: null });
      expect(votesFor(next, ROUND_A2)).toEqual([]);
    });
  });

  describe("UC-1 vote, change, retract, reveal", () => {
    it("stores one vote, replaces it, retracts it, then locks the revealed round", () => {
      const table = currentTable(standardRoom(4));
      const cast = apply(
        table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", comment: "because", now: NOW }),
      );
      expect(cast.table.room.version).toBe(4);
      expect(eventTypes(cast.events)).toEqual(["vote.changed"]);
      const changed = cast.events[0];
      if (!changed) throw new Error("missing vote.changed");
      expectEnvelope(changed, cast.table.room, "vote.changed", NOW, { participantId: VOTER_A, hasVoted: true });
      expect(JSON.stringify(cast.events)).not.toContain("because");
      expect(JSON.stringify(cast.events)).not.toContain("clubs");
      expect(votesFor(cast.table, ROUND_A1)).toHaveLength(1);
      expect(votesFor(cast.table, ROUND_A1)[0]).toMatchObject({
        participantId: VOTER_A,
        comment: "because",
        card: { label: "5", numeric: 5, kind: "numeric" },
      });
      expect(votesFor(cast.table, ROUND_A1)[0]?.suit.kind).toBe("clubs");

      const replaced = apply(cast.table.castVote({ participantId: VOTER_A, card: "8", suit: "hearts", now: NOW }));
      expect(votesFor(replaced.table, ROUND_A1)).toHaveLength(1);
      expect(votesFor(replaced.table, ROUND_A1)[0]?.card.label).toBe("8");
      expect(votesFor(replaced.table, ROUND_A1)[0]?.suit.kind).toBe("hearts");
      expect(votesFor(replaced.table, ROUND_A1)[0]?.comment).toBeNull();
      expect(replaced.events[0]?.payload).toEqual({ participantId: VOTER_A, hasVoted: true });
      expect(JSON.stringify(replaced.events)).not.toContain("hearts");
      expect(JSON.stringify(replaced.events)).not.toContain("8");

      const retracted = apply(replaced.table.retractVote({ participantId: VOTER_A, now: NOW }));
      expect(votesFor(retracted.table, ROUND_A1)).toEqual([]);
      expect(retracted.events[0]?.payload).toEqual({ participantId: VOTER_A, hasVoted: false });
      expect(code(retracted.table.retractVote({ participantId: VOTER_A, now: NOW }))).toBe("NOT_FOUND");

      const revealed = apply(retracted.table.reveal({ actorParticipantId: HOST, now: NOW }));
      expect(eventTypes(revealed.events)).toEqual(["round.revealed"]);
      const revealedEvent = revealed.events[0];
      if (!revealedEvent) throw new Error("missing round.revealed");
      expectEnvelope(revealedEvent, revealed.table.room, "round.revealed", NOW, { roundId: ROUND_A1 });
      expect(roundOf(revealed.table, ROUND_A1).status).toBe("revealed");
      expect(roundOf(revealed.table, ROUND_A1).stats).toEqual(computeRoundStats(scale, []));
      const before = snapshot(revealed.table);
      expect(code(revealed.table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", now: NOW }))).toBe(
        "ROUND_NOT_VOTING",
      );
      expect(code(revealed.table.retractVote({ participantId: VOTER_A, now: NOW }))).toBe("ROUND_NOT_VOTING");
      expect(code(revealed.table.reveal({ actorParticipantId: HOST, now: NOW }))).toBe("VALIDATION");
      expectUnchanged(revealed.table, before);
    });

    it("keeps one vote per participant and a null suit as joker", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: VOTER_A, card: "5", suit: null, now: NOW })).table;
      expect(votesFor(table, ROUND_A1)[0]?.suit.kind).toBe("joker");
      table = apply(table.castVote({ participantId: VOTER_B, card: "3", suit: "spades", comment: "b", now: NOW })).table;
      table = apply(table.castVote({ participantId: VOTER_A, card: "½", suit: "diamonds", now: NOW })).table;
      const votes = votesFor(table, ROUND_A1);
      expect(votes).toHaveLength(2);
      expect(votes.find((vote) => vote.participantId === VOTER_A)?.card).toMatchObject({ label: "½", numeric: 0.5 });
      expect(votes.find((vote) => vote.participantId === VOTER_A)?.suit.kind).toBe("diamonds");
      expect(votes.find((vote) => vote.participantId === VOTER_B)?.card.label).toBe("3");
    });

    it.each(["4", "purple-card"])("rejects card %s without storing a vote", (card) => {
      const table = currentTable();
      const before = snapshot(table);
      expect(code(table.castVote({ participantId: VOTER_A, card, suit: "clubs", now: NOW }))).toBe("VALIDATION");
      expectUnchanged(table, before);
    });

    it("rejects an unknown suit and a comment over 140 characters", () => {
      const table = currentTable();
      expect(MAX_VOTE_COMMENT_LENGTH).toBe(140);
      const before = snapshot(table);
      expect(code(table.castVote({ participantId: VOTER_A, card: "5", suit: "purple", now: NOW }))).toBe("VALIDATION");
      expect(
        code(table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", comment: "c".repeat(141), now: NOW })),
      ).toBe("VALIDATION");
      expectUnchanged(table, before);
      const stored = apply(
        table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", comment: "c".repeat(140), now: NOW }),
      );
      expect(votesFor(stored.table, ROUND_A1)[0]?.comment).toBe("c".repeat(140));
    });

    it("forbids observers, AFK voters, and unknown participants", () => {
      const room = withSeats(standardRoom(), [
        { id: "observer-1", nickname: "Omar", role: "observer", mode: "observer" },
        { id: "afk-1", nickname: "Fern", role: "dev", afk: true },
      ]);
      const table = currentTable(room);
      const before = snapshot(table);
      expect(code(table.castVote({ participantId: branded(ParticipantId, "observer-1"), card: "5", suit: "clubs", now: NOW }))).toBe(
        "FORBIDDEN",
      );
      expect(code(table.castVote({ participantId: branded(ParticipantId, "afk-1"), card: "5", suit: "clubs", now: NOW }))).toBe(
        "FORBIDDEN",
      );
      expect(code(table.castVote({ participantId: branded(ParticipantId, "missing"), card: "5", suit: "clubs", now: NOW }))).toBe(
        "NOT_FOUND",
      );
      const stored = table.castVote({ participantId: VOTER_A, card: "AFK", suit: "joker", now: NOW });
      expect(code(stored)).toBe("OK");
      expectUnchanged(table, before);
      if (!stored.ok) throw new Error("AFK card");
      expect(votesFor(stored.value.table, ROUND_A1)[0]?.card).toMatchObject({ label: "AFK", kind: "special", numeric: null });
    });

    it("lets an observer host reveal and forbids that host from voting", () => {
      const room = withSeats(makeRoom({ hostMode: "observer" }), [{ id: "voter-a", nickname: "Ada", role: "dev" }]);
      const table = currentTable(room);
      const before = snapshot(table);
      expect(code(table.castVote({ participantId: HOST, card: "5", suit: "clubs", now: NOW }))).toBe("FORBIDDEN");
      expectUnchanged(table, before);
      expect(apply(table.reveal({ actorParticipantId: HOST, now: NOW })).table.rounds[0]?.status).toBe("revealed");
    });
  });

  describe("UC-2 rounds, stats, and final estimate", () => {
    it("keeps revealed stats when round 2 opens and accepts a final estimate away from the mean", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: HOST, card: "3", suit: "clubs", now: NOW })).table;
      table = apply(table.castVote({ participantId: VOTER_A, card: "8", suit: "clubs", now: NOW })).table;
      const revealed = apply(table.reveal({ actorParticipantId: HOST, now: NOW }));
      const stats = computeRoundStats(
        scale,
        votesFor(revealed.table, ROUND_A1).map((vote) => ({
          participantId: vote.participantId,
          card: vote.card,
          suit: vote.suit,
        })),
      );
      expect(stats.mean).toBe(5.5);
      expect(roundOf(revealed.table, ROUND_A1).stats).toEqual(stats);
      const estimated = apply(
        revealed.table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "5", now: NOW }),
      );
      expect(estimated.audit).toBeNull();
      expect(eventTypes(estimated.events)).toEqual(["item.estimate_finalized"]);
      expect(estimated.events[0]?.payload).toEqual({ itemId: ITEM_A });
      expect(itemOf(estimated.table, ITEM_A).status).toBe("estimated");
      expect(itemOf(estimated.table, ITEM_A).finalEstimate).toMatchObject({ label: "5", numeric: 5, kind: "numeric" });
      expect(itemOf(estimated.table, ITEM_A).finalSuit).toBe("clubs");

      const before = snapshot(estimated.table);
      expect(code(estimated.table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "?", now: NOW }))).toBe(
        "VALIDATION",
      );
      expectUnchanged(estimated.table, before);

      const changed = apply(
        estimated.table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "8", suit: "diamonds", now: NOW }),
      );
      expect(changed.audit).toBeInstanceOf(EstimateAudit);
      expect(changed.audit).toMatchObject({ itemId: ITEM_A, changedBy: HOST, from: "5", to: "8" });
      expect(changed.audit?.at).toBe(NOW);
      expect(JSON.stringify(changed.events)).not.toContain("because");
      expect(itemOf(changed.table, ITEM_A).finalSuit).toBe("diamonds");
      expect(itemOf(changed.table, ITEM_A).status).toBe("estimated");

      const same = apply(changed.table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "8", now: NOW }));
      expect(same.audit).toBeNull();
      expect(same.events).toEqual([]);

      const next = apply(changed.table.newRound({ actorParticipantId: HOST, itemId: ITEM_A, roundId: ROUND_A2, now: NOW }));
      expect(itemOf(next.table, ITEM_A).status).toBe("current");
      expect(itemOf(next.table, ITEM_A).finalEstimate?.label).toBe("8");
      expect(roundOf(next.table, ROUND_A1).status).toBe("revealed");
      expect(roundOf(next.table, ROUND_A1).stats).toEqual(stats);
      expect(roundOf(next.table, ROUND_A2)).toMatchObject({ number: 2, status: "voting", stats: null });
      expect(votesFor(next.table, ROUND_A1)).toHaveLength(2);
      expect(votesFor(next.table, ROUND_A2)).toEqual([]);
      expect(eventTypes(next.events)).toEqual(["item.queue_updated", "round.started"]);
      expect(next.events.find((event) => event.type === "round.started")?.payload).toEqual({
        roundId: ROUND_A2,
        itemId: ITEM_A,
      });
      const recast = apply(next.table.castVote({ participantId: VOTER_A, card: "13", suit: "hearts", now: NOW }));
      expect(votesFor(recast.table, ROUND_A2)).toHaveLength(1);
      expect(votesFor(recast.table, ROUND_A1)).toHaveLength(2);
      expect(code(next.table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "13", now: NOW }))).toBe(
        "VALIDATION",
      );
    });

    it.each(["?", "Coringa", "AFK", "4"])("rejects final estimate %s", (label) => {
      const table = reach("current-revealed");
      const before = snapshot(table);
      expect(code(table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label, now: NOW }))).toBe("VALIDATION");
      expectUnchanged(table, before);
    });

    it("stores a null final suit when the numeric suits tie", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: HOST, card: "3", suit: "clubs", now: NOW })).table;
      table = apply(table.castVote({ participantId: VOTER_A, card: "8", suit: "hearts", now: NOW })).table;
      table = apply(table.reveal({ actorParticipantId: HOST, now: NOW })).table;
      const estimated = apply(table.setFinalEstimate({ actorParticipantId: HOST, itemId: ITEM_A, label: "5", now: NOW })).table;
      expect(itemOf(estimated, ITEM_A).finalSuit).toBeNull();
    });

    it("rejects a card outside the active scale", () => {
      const narrow = must(ScaleBuilder.fibonacci().withId("narrow").withName("Narrow").without("13").build());
      const room = withSeats(makeRoom({ activeScale: narrow }), [{ id: "voter-a", nickname: "Ada", role: "dev" }]);
      const table = currentTable(room);
      expect(code(table.castVote({ participantId: VOTER_A, card: "13", suit: "clubs", now: NOW }))).toBe("VALIDATION");
      expect(code(table.castVote({ participantId: VOTER_A, card: "8", suit: "clubs", now: NOW }))).toBe("OK");
    });
  });

  describe("INV-03 through INV-09", () => {
    it("rejects two current items, two voting rounds, a duplicate vote, and an off-scale rehydrated card", () => {
      const room = standardRoom();
      const pending = must(buildItem({ status: "pending" }));
      const currentA = must(buildItem({ status: "current" }));
      const currentB = must(buildItem({ id: ITEM_B, title: "Beta", position: 1, status: "current" }));
      expect(code(PlanningTable.rehydrate({ room, items: [currentA, currentB], rounds: [], votes: [] }))).toBe("VALIDATION");

      const voting = must(
        Round.rehydrate({
          id: ROUND_A1,
          roomId: ROOM,
          itemId: ITEM_A,
          number: 1,
          status: "voting",
          timerEndsAt: null,
          stats: null,
        }),
      );
      const secondVoting = must(
        Round.rehydrate({
          id: ROUND_A2,
          roomId: ROOM,
          itemId: ITEM_A,
          number: 2,
          status: "voting",
          timerEndsAt: null,
          stats: null,
        }),
      );
      expect(code(PlanningTable.rehydrate({ room, items: [currentA], rounds: [voting, secondVoting], votes: [] }))).toBe(
        "VALIDATION",
      );

      const vote = must(
        Vote.rehydrate({
          roundId: ROUND_A1,
          participantId: VOTER_A,
          card: deckCard("5"),
          suit: Suit.clubs,
          comment: "kept",
        }),
      );
      const duplicate = must(
        Vote.rehydrate({
          roundId: ROUND_A1,
          participantId: VOTER_A,
          card: deckCard("8"),
          suit: Suit.hearts,
          comment: null,
        }),
      );
      expect(code(PlanningTable.rehydrate({ room, items: [currentA], rounds: [voting], votes: [vote, duplicate] }))).toBe(
        "VALIDATION",
      );
      const offScale = must(
        Vote.rehydrate({
          roundId: ROUND_A1,
          participantId: VOTER_A,
          card: Object.freeze({ label: "4", numeric: 4, kind: "numeric" }),
          suit: Suit.clubs,
          comment: null,
        }),
      );
      expect(code(PlanningTable.rehydrate({ room, items: [currentA], rounds: [voting], votes: [offScale] }))).toBe(
        "VALIDATION",
      );
      const orphan = must(
        Vote.rehydrate({
          roundId: ROUND_A2,
          participantId: VOTER_A,
          card: deckCard("5"),
          suit: Suit.clubs,
          comment: null,
        }),
      );
      expect(code(PlanningTable.rehydrate({ room, items: [currentA], rounds: [voting], votes: [orphan] }))).toBe(
        "VALIDATION",
      );

      const displaced = must(PlanningTable.rehydrate({ room, items: [pending], rounds: [voting], votes: [vote] }));
      expect(itemOf(displaced, ITEM_A).status).toBe("pending");
      expect(votesFor(displaced, ROUND_A1)[0]?.comment).toBe("kept");
    });

    it("forbids a voter from reveal, queue, estimate, timer, and new round commands", () => {
      let table = currentTable();
      const built = must(buildItem({ id: ITEM_B, title: "Beta", position: 1 }));
      const before = snapshot(table);
      expect(code(table.addItem({ actorParticipantId: VOTER_A, item: built, now: NOW }))).toBe("FORBIDDEN");
      expect(code(table.skip({ actorParticipantId: VOTER_A, itemId: ITEM_A, now: NOW }))).toBe("FORBIDDEN");
      expect(code(table.reorder({ actorParticipantId: VOTER_A, itemIds: [ITEM_A], now: NOW }))).toBe("FORBIDDEN");
      expect(code(table.reveal({ actorParticipantId: VOTER_A, now: NOW }))).toBe("FORBIDDEN");
      expect(code(table.newRound({ actorParticipantId: VOTER_A, itemId: ITEM_A, roundId: ROUND_A2, now: NOW }))).toBe(
        "FORBIDDEN",
      );
      expect(code(table.setFinalEstimate({ actorParticipantId: VOTER_A, itemId: ITEM_A, label: "5", now: NOW }))).toBe(
        "FORBIDDEN",
      );
      expect(code(table.startTimer({ actorParticipantId: VOTER_A, endsAt: at(130), now: NOW }))).toBe("FORBIDDEN");
      expect(code(table.skip({ actorParticipantId: HOST, itemId: branded(ItemId, "missing"), now: NOW }))).toBe("NOT_FOUND");
      expectUnchanged(table, before);
      table = apply(table.reveal({ actorParticipantId: HOST, now: NOW })).table;
      const facilitatorRoom = withSeats(makeRoom(), [
        { id: "facilitator-1", nickname: "Fac", role: "qa", isFacilitator: true },
      ]);
      const facilitated = currentTable(facilitatorRoom);
      const revealed = apply(
        facilitated.reveal({ actorParticipantId: branded(ParticipantId, "facilitator-1"), now: NOW }),
      ).table;
      expect(roundOf(revealed, ROUND_A1).status).toBe("revealed");
      expect(
        itemOf(
          apply(
            revealed.setFinalEstimate({
              actorParticipantId: branded(ParticipantId, "facilitator-1"),
              itemId: ITEM_A,
              label: "5",
              now: NOW,
            }),
          ).table,
          ITEM_A,
        ).status,
      ).toBe("estimated");
    });
  });

  describe("auto-reveal predicate and timer", () => {
    it("is true only when auto-reveal is on and every online non-AFK voter has voted", () => {
      const room = withSeats(makeRoom({ autoReveal: true }), [
        { id: "voter-a", nickname: "Ada", role: "dev" },
        { id: "voter-b", nickname: "Bea", role: "qa", seenAt: at(0) },
        { id: "observer-1", nickname: "Omar", role: "observer", mode: "observer" },
        { id: "afk-1", nickname: "Fern", role: "dev", afk: true },
      ]);
      let table = currentTable(room);
      expect(table.shouldAutoReveal(NOW)).toBe(false);
      expect(roundOf(table, ROUND_A1).status).toBe("voting");
      table = apply(table.castVote({ participantId: HOST, card: "?", suit: "joker", now: NOW })).table;
      const before = snapshot(table);
      expect(table.shouldAutoReveal(NOW)).toBe(false);
      expectUnchanged(table, before);
      table = apply(table.castVote({ participantId: VOTER_A, card: "5", suit: "clubs", now: NOW })).table;
      const voted = snapshot(table);
      expect(table.shouldAutoReveal(NOW)).toBe(true);
      expect(roundOf(table, ROUND_A1).status).toBe("voting");
      expect(table.shouldAutoReveal(at(200))).toBe(false);
      expect(snapshot(table)).toEqual(voted);
    });

    it("stays false when auto-reveal is off, even if the timer has elapsed", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: HOST, card: "5", suit: "clubs", now: NOW })).table;
      table = apply(table.castVote({ participantId: VOTER_A, card: "8", suit: "hearts", now: NOW })).table;
      table = apply(table.castVote({ participantId: VOTER_B, card: "13", suit: "spades", now: NOW })).table;
      expect(table.shouldAutoReveal(NOW)).toBe(false);
      const endsAt = at(90);
      const started = apply(table.startTimer({ actorParticipantId: HOST, endsAt, now: NOW }));
      expect(eventTypes(started.events)).toEqual(["timer.updated"]);
      expect(started.events[0]?.payload).toEqual({ endsAt: endsAt.toISOString() });
      expect(roundOf(started.table, ROUND_A1).status).toBe("voting");
      expect(roundOf(started.table, ROUND_A1).timerEndsAt).toBe(endsAt);
      expect(started.table.shouldAutoReveal(NOW)).toBe(false);
      const stopped = apply(started.table.stopTimer({ actorParticipantId: HOST, now: NOW }));
      expect(stopped.events[0]?.payload).toEqual({ endsAt: null });
      expect(roundOf(stopped.table, ROUND_A1).timerEndsAt).toBeNull();
      expect(open(standardRoom()).shouldAutoReveal(NOW)).toBe(false);
    });
  });

  describe("UC-4 queue", () => {
    it("demotes the previous current item to pending, keeps its vote, and opens round 1 on the next item", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: VOTER_A, card: "13", suit: "clubs", comment: "secret-ada", now: NOW })).table;
      const beta = must(buildItem({ id: ITEM_B, title: "Beta", position: 1, figureTag: "A" }));
      table = apply(table.addItem({ actorParticipantId: HOST, item: beta, now: NOW })).table;
      const moved = apply(table.setCurrent({ actorParticipantId: HOST, itemId: ITEM_B, roundId: ROUND_B1, now: NOW }));
      expect(itemOf(moved.table, ITEM_A).status).toBe("pending");
      expect(itemOf(moved.table, ITEM_B).status).toBe("current");
      expect(moved.table.items.filter((entry) => entry.status === "current")).toHaveLength(1);
      expect(roundOf(moved.table, ROUND_A1).status).toBe("voting");
      expect(votesFor(moved.table, ROUND_A1)[0]?.card.label).toBe("13");
      expect(roundOf(moved.table, ROUND_B1)).toMatchObject({ number: 1, status: "voting", itemId: ITEM_B });
      expect(votesFor(moved.table, ROUND_B1)).toEqual([]);
      expect(eventTypes(moved.events)).toEqual(["item.queue_updated", "round.started"]);
      expect(moved.events.find((event) => event.type === "round.started")?.payload).toEqual({
        roundId: ROUND_B1,
        itemId: ITEM_B,
      });
    });

    it("keeps votes when the current item is deferred", () => {
      let table = currentTable();
      table = apply(table.castVote({ participantId: VOTER_A, card: "8", suit: "hearts", now: NOW })).table;
      const deferred = apply(table.defer({ actorParticipantId: HOST, itemId: ITEM_A, now: NOW })).table;
      expect(itemOf(deferred, ITEM_A).status).toBe("deferred");
      expect(roundOf(deferred, ROUND_A1).status).toBe("voting");
      expect(votesFor(deferred, ROUND_A1)).toHaveLength(1);
      expect(eventTypes(apply(table.defer({ actorParticipantId: HOST, itemId: ITEM_A, now: NOW })).events)).toEqual([
        "item.queue_updated",
      ]);
    });

    it("rejects reorder lists that omit, duplicate, or invent ids", () => {
      let table = currentTable();
      const beta = must(buildItem({ id: ITEM_B, title: "Beta", position: 1 }));
      table = apply(table.addItem({ actorParticipantId: HOST, item: beta, now: NOW })).table;
      const before = snapshot(table);
      expect(code(table.reorder({ actorParticipantId: HOST, itemIds: [ITEM_A], now: NOW }))).toBe("VALIDATION");
      expect(code(table.reorder({ actorParticipantId: HOST, itemIds: [ITEM_A, ITEM_A], now: NOW }))).toBe("VALIDATION");
      expect(
        code(table.reorder({ actorParticipantId: HOST, itemIds: [ITEM_A, ITEM_B, branded(ItemId, "item-z")], now: NOW })),
      ).toBe("VALIDATION");
      expectUnchanged(table, before);
      const ordered = apply(table.reorder({ actorParticipantId: HOST, itemIds: [ITEM_B, ITEM_A], now: NOW }));
      expect(ordered.table.items.map((entry) => entry.id)).toEqual([ITEM_B, ITEM_A]);
      expect(ordered.table.items.map((entry) => entry.position)).toEqual([0, 1]);
      expect(ordered.events[0]?.payload).toEqual({ itemIds: [ITEM_B, ITEM_A] });
      expect(votesFor(ordered.table, ROUND_A1)).toEqual(votesFor(table, ROUND_A1));
    });

    it("rejects the 501st item and a mismatched room or team", () => {
      expect(MAX_ITEMS_PER_ROOM).toBe(500);
      let table = open(standardRoom());
      for (let index = 0; index < MAX_ITEMS_PER_ROOM; index += 1) {
        const built = must(buildItem({ id: branded(ItemId, `item-${index}`), title: `Item ${index}`, position: index }));
        table = apply(table.addItem({ actorParticipantId: HOST, item: built, now: NOW })).table;
      }
      expect(table.items).toHaveLength(500);
      const extra = must(buildItem({ id: branded(ItemId, "item-500"), title: "Overflow", position: 500 }));
      expect(code(table.addItem({ actorParticipantId: HOST, item: extra, now: NOW }))).toBe("LIMIT_EXCEEDED");
      expect(table.items).toHaveLength(500);

      const fresh = open(standardRoom());
      const wrongRoom = must(buildItem({ roomId: branded(RoomId, "room-2") }));
      expect(code(fresh.addItem({ actorParticipantId: HOST, item: wrongRoom, now: NOW }))).toBe("VALIDATION");
      const guestTeam = must(buildItem({ teamId: TEAM }));
      expect(code(fresh.addItem({ actorParticipantId: HOST, item: guestTeam, now: NOW }))).toBe("VALIDATION");
      const wrongPosition = must(buildItem({ position: 5 }));
      expect(code(fresh.addItem({ actorParticipantId: HOST, item: wrongPosition, now: NOW }))).toBe("VALIDATION");

      const teamRoom = withSeats(makeRoom({ kind: "team" }), [{ id: "voter-a", nickname: "Ada", role: "dev" }]);
      const teamTable = open(teamRoom);
      const otherTeam = must(buildItem({ teamId: branded(TeamId, "team-2") }));
      expect(code(teamTable.addItem({ actorParticipantId: HOST, item: otherTeam, now: NOW }))).toBe("VALIDATION");
      const matched = must(buildItem({ teamId: TEAM, externalKey: "FIB-9", figureTag: "J" }));
      const added = apply(teamTable.addItem({ actorParticipantId: HOST, item: matched, now: NOW })).table;
      expect(itemOf(added, ITEM_A)).toMatchObject({ teamId: TEAM, externalKey: "FIB-9", figureTag: "J", position: 0 });
    });
  });
});

describe("projectRoomForViewer", () => {
  beforeAll(async () => {
    await loadProjector();
  });

  it("returns an empty consistent view for a screen without throwing", () => {
    const room = standardRoom();
    const view = projectRoomForViewer(room, [], [], [], { kind: "screen" }, NOW);
    expect(view.serverTime).toBe(NOW);
    expect(view.version).toBe(room.version);
    expect(view.id).toBe(room.id);
    expect(view.code).toBe(room.code);
    expect(view.currentItem).toBeNull();
    expect(view.currentRound).toBeNull();
    expect(view.queue).toEqual([]);
    expect(view.ownVote).toBeNull();
    expect(view.votes).toBeNull();
    expect(view.stats).toBeNull();
    expect(view.permissions).toEqual(allDenied());
    expect(view.participants.map((participant) => participant.id)).toEqual(room.participants.map((participant) => participant.id));
  });

  it("shows Ada only her vote while voting, and shows the screen no card, suit, or comment", () => {
    let table = currentTable();
    table = apply(
      table.castVote({ participantId: VOTER_A, card: "13", suit: "clubs", comment: "secret-ada", now: NOW }),
    ).table;
    table = apply(
      table.castVote({ participantId: VOTER_B, card: "21", suit: "hearts", comment: "secret-bea", now: NOW }),
    ).table;
    const other = apply(
      currentTable().castVote({ participantId: VOTER_A, card: "13", suit: "clubs", comment: "secret-ada", now: NOW }),
    ).table;
    const hidden = apply(
      other.castVote({ participantId: VOTER_B, card: "8", suit: "spades", comment: "secret-bea-2", now: NOW }),
    ).table;

    const ada = project(table, { kind: "participant", participantId: VOTER_A });
    const adaHidden = project(hidden, { kind: "participant", participantId: VOTER_A });
    const screen = project(table, { kind: "screen" });
    const screenHidden = project(hidden, { kind: "screen" });
    expect(stripOwnVote(ada)).toEqual(stripOwnVote(adaHidden));
    expect(ada.ownVote?.card.label).toBe("13");
    expect(ada.ownVote?.suit.kind).toBe("clubs");
    expect(ada.ownVote?.comment).toBe("secret-ada");
    expect(screen).toEqual(screenHidden);
    expect(screen.ownVote).toBeNull();
    expect(ada.votes).toBeNull();
    expect(ada.stats).toBeNull();
    expect(screen.votes).toBeNull();
    expect(screen.stats).toBeNull();
    for (const key of ["card", "suit", "comment"]) {
      expect(keysOf(screen)).not.toContain(key);
      expect(keysOf(stripOwnVote(ada))).not.toContain(key);
    }
    expect(JSON.stringify(screen)).not.toContain("secret-bea");
    expect(JSON.stringify(screen)).not.toContain("\"21\"");
    expect(JSON.stringify(screen)).not.toContain("\"13\"");
    expect(ada.participants.find((participant) => participant.id === VOTER_B)).toMatchObject({
      hasVoted: true,
      nickname: "Bea",
      online: true,
      afk: false,
    });
    expect(ada.participants.find((participant) => participant.id === HOST)?.hasVoted).toBe(false);
    expect(ada.currentRound).toMatchObject({ id: ROUND_A1, status: "voting", number: 1 });
    expect(Object.keys(ada.participants[0] ?? {}).sort()).toEqual([
      "afk",
      "hasVoted",
      "id",
      "mode",
      "nickname",
      "online",
      "role",
    ]);
  });

  it("keeps voter A and screen projections equal across 1000 hidden votes", () => {
    const base = currentTable();
    fc.assert(
      fc.property(
        fc.constantFrom(...CARD_LABELS),
        fc.constantFrom(...CARD_LABELS),
        fc.constantFrom(...SUIT_KINDS),
        fc.constantFrom(...SUIT_KINDS),
        fc.integer({ min: 0, max: 0xffffff }),
        fc.integer({ min: 0, max: 0xffffff }),
        (cardA, cardB, suitA, suitB, rawA, rawB) => {
          const hiddenCard = cardB === cardA ? flipCard(cardB) : cardB;
          const hiddenSuit = suitB === suitA ? flipSuit(suitB) : suitB;
          const noteA = `a:${rawA.toString(16)}`;
          const noteB = `b:${rawB.toString(16)}`;
          const noteB2 = `${noteB}x`;
          const world1 = apply(
            apply(base.castVote({ participantId: VOTER_A, card: cardA, suit: suitA, comment: noteA, now: NOW })).table.castVote({
              participantId: VOTER_B,
              card: cardB,
              suit: suitB,
              comment: noteB,
              now: NOW,
            }),
          ).table;
          const world2 = apply(
            apply(base.castVote({ participantId: VOTER_A, card: cardA, suit: suitA, comment: noteA, now: NOW })).table.castVote({
              participantId: VOTER_B,
              card: hiddenCard,
              suit: hiddenSuit,
              comment: noteB2,
              now: NOW,
            }),
          ).table;
          const ada1 = project(world1, { kind: "participant", participantId: VOTER_A });
          const ada2 = project(world2, { kind: "participant", participantId: VOTER_A });
          const screen1 = project(world1, { kind: "screen" });
          const screen2 = project(world2, { kind: "screen" });
          expect(stripOwnVote(ada1)).toEqual(stripOwnVote(ada2));
          expect(ada1.ownVote?.card.label).toBe(cardA);
          expect(ada1.ownVote?.suit.kind).toBe(suitA);
          expect(ada1.ownVote?.comment).toBe(noteA);
          expect(screen1).toEqual(screen2);
          expect(screen1.ownVote).toBeNull();
          expect(screen1.permissions).toEqual(allDenied());
          for (const key of ["card", "suit", "comment"]) {
            expect(keysOf(screen1)).not.toContain(key);
            expect(keysOf(stripOwnVote(ada1))).not.toContain(key);
          }
          expect(stringsOf(screen1)).not.toContain(noteB);
          expect(stringsOf(stripOwnVote(ada1))).not.toContain(noteB2);
          expect(stringsOf(stripOwnVote(ada1))).not.toContain(hiddenCard);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("includes both cards and stats after reveal, still without comments", () => {
    let table = currentTable();
    table = apply(table.castVote({ participantId: VOTER_A, card: "3", suit: "clubs", comment: "secret-ada", now: NOW })).table;
    table = apply(table.castVote({ participantId: VOTER_B, card: "8", suit: "hearts", comment: "secret-bea", now: NOW })).table;
    table = apply(table.reveal({ actorParticipantId: HOST, now: NOW })).table;
    const ada = project(table, { kind: "participant", participantId: VOTER_A });
    const screen = project(table, { kind: "screen" });
    const labels = (view: RoomView) => (view.votes ?? []).map((vote) => vote.card.label).sort();
    expect(labels(ada)).toEqual(["3", "8"]);
    expect(labels(screen)).toEqual(["3", "8"]);
    expect(ada.stats).toEqual(
      computeRoundStats(
        scale,
        table.votes.map((vote) => ({ participantId: vote.participantId, card: vote.card, suit: vote.suit })),
      ),
    );
    expect(screen.stats).toEqual(ada.stats);
    expect(ada.ownVote?.comment).toBe("secret-ada");
    expect(keysOf(ada.votes)).not.toContain("comment");
    expect(keysOf(screen.votes)).not.toContain("comment");
    expect(JSON.stringify(ada.votes)).not.toContain("secret-bea");
    expect(screen.ownVote).toBeNull();
  });

  it("hides a displaced item's unrevealed card from the current voting view", () => {
    let table = currentTable();
    table = apply(table.castVote({ participantId: VOTER_A, card: "13", suit: "clubs", comment: "secret-ada", now: NOW })).table;
    table = apply(
      table.addItem({ actorParticipantId: HOST, item: must(buildItem({ id: ITEM_B, title: "Beta", position: 1 })), now: NOW }),
    ).table;
    table = apply(table.setCurrent({ actorParticipantId: HOST, itemId: ITEM_B, roundId: ROUND_B1, now: NOW })).table;
    const screen = project(table, { kind: "screen" });
    expect(screen.currentItem?.id).toBe(ITEM_B);
    expect(screen.currentRound?.status).toBe("voting");
    expect(JSON.stringify(screen)).not.toContain("\"13\"");
    expect(JSON.stringify(screen)).not.toContain("secret-ada");
    expect(keysOf(screen)).not.toContain("card");
  });

  it("derives online from the 45s window and permissions from can", () => {
    expect(ONLINE_WINDOW_SECONDS).toBe(45);
    const onlineAt = new Date(NOW.getTime() - ONLINE_WINDOW_SECONDS * 1000);
    const offlineAt = new Date(NOW.getTime() - (ONLINE_WINDOW_SECONDS + 1) * 1000);
    const room = withSeats(makeRoom(), [
      { id: "voter-a", nickname: "Ada", role: "dev", seenAt: onlineAt },
      { id: "voter-b", nickname: "Bea", role: "qa", seenAt: offlineAt },
      { id: "observer-1", nickname: "Omar", role: "observer", mode: "observer", seenAt: onlineAt },
    ]);
    const table = currentTable(room);
    const ada = project(table, { kind: "participant", participantId: VOTER_A });
    expect(ada.participants.find((participant) => participant.id === VOTER_A)?.online).toBe(true);
    expect(ada.participants.find((participant) => participant.id === VOTER_B)?.online).toBe(false);
    expect(ada.serverTime).toBe(NOW);
    expect(ada.version).toBe(room.version);
    expect(ada.permissions).toEqual(
      permissionsFor(
        { kind: "guest", isHost: false, isFacilitator: false, roomMode: "voter" },
        { roomKind: "guest", actorCreatedRoom: false },
      ),
    );
    const host = project(table, { kind: "participant", participantId: HOST });
    expect(host.permissions).toEqual(
      permissionsFor(
        { kind: "guest", isHost: true, isFacilitator: false, roomMode: "voter" },
        { roomKind: "guest", actorCreatedRoom: true },
      ),
    );
    const observer = project(table, { kind: "participant", participantId: branded(ParticipantId, "observer-1") });
    expect(observer.ownVote).toBeNull();
    expect(observer.permissions).toEqual(
      permissionsFor(
        { kind: "guest", isHost: false, isFacilitator: false, roomMode: "observer" },
        { roomKind: "guest", actorCreatedRoom: false },
      ),
    );
    expect(project(table, { kind: "screen" }).permissions).toEqual(allDenied());

    const team = currentTable(withSeats(makeRoom({ kind: "team" }), [{ id: "voter-a", nickname: "Ada", role: "dev" }]));
    expect(project(team, { kind: "participant", participantId: VOTER_A }).permissions).toEqual(
      permissionsFor(
        { kind: "member", teamRole: "dev", isHost: false, isFacilitator: false, roomMode: "voter" },
        { roomKind: "team", actorCreatedRoom: false },
      ),
    );
  });
});
