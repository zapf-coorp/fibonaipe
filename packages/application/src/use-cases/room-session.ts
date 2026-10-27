import {
  ANON_ROOM_TTL_MINUTES,
  ClientOpId,
  ItemBuilder,
  ItemId,
  Participant,
  ParticipantId,
  PlanningTable,
  RATE_LIMIT_CREATE_ROOM,
  RATE_LIMIT_JOIN_ATTEMPTS,
  RATE_LIMIT_MUTATIONS,
  Room,
  RoomCode,
  RoomId,
  RoundId,
  ScaleBuilder,
  can,
  createAppError,
  err,
  ok,
  parseSuit,
  type AppError,
  type Card,
  type ItemProps,
  type ItemStatus,
  type PlanningEvent,
  type PolicyAction,
  type PolicyActor,
  type Result,
  UserId,
  type RoomSettings,
  type RoundProps,
  type RoundStats,
  type VoteProps,
} from "@fibonaipe/domain";
import type { Clock } from "../ports/clock.port.js";
import type { Exporter } from "../ports/exporter.port.js";
import type { IdGenerator } from "../ports/id-generator.port.js";
import type { IssueTracker } from "../ports/issue-tracker.port.js";
import type { LogEntry, StructuredLogger } from "../ports/logger.port.js";
import type { PersistedRoomRecord, Persistence, TransactionRepos } from "../ports/persistence.port.js";
import type { RateLimitRule, RateLimiter } from "../ports/rate-limiter.port.js";
import type { RealtimePublisher } from "../ports/realtime.port.js";
import type { RoomEvent } from "../projections/events.js";

export interface UseCaseDependencies {
  readonly persistence: Persistence;
  readonly realtime: RealtimePublisher;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly rateLimiter: RateLimiter;
  readonly issueTracker: IssueTracker;
  readonly exporter: Exporter;
  readonly logger: StructuredLogger;
}

export const CREATE_ROOM_RULE: RateLimitRule = {
  id: "create-room",
  limit: RATE_LIMIT_CREATE_ROOM.limit,
  windowSeconds: RATE_LIMIT_CREATE_ROOM.windowSeconds,
};

export const JOIN_ATTEMPT_RULE: RateLimitRule = {
  id: "join-attempts",
  limit: RATE_LIMIT_JOIN_ATTEMPTS.limit,
  windowSeconds: RATE_LIMIT_JOIN_ATTEMPTS.windowSeconds,
};

export const MUTATION_RULE: RateLimitRule = {
  id: "mutations",
  limit: RATE_LIMIT_MUTATIONS.limit,
  windowSeconds: RATE_LIMIT_MUTATIONS.windowSeconds,
};

const MINUTE_MS = 60_000;

interface StoredParticipant {
  readonly id: string;
  readonly userId: string | null;
  readonly guestSessionId: string | null;
  readonly nickname: string;
  readonly role: string;
  readonly mode: "voter" | "observer";
  readonly isFacilitator: boolean;
  readonly joinedAt: Date;
  readonly lastSeenAt: Date;
  readonly afk: boolean;
}

interface StoredItem {
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

interface StoredRound {
  readonly id: string;
  readonly roomId: string;
  readonly itemId: string;
  readonly number: number;
  readonly status: "voting" | "revealed";
  readonly timerEndsAt: Date | null;
  readonly stats: RoundStats | null;
}

interface StoredVote {
  readonly roundId: string;
  readonly participantId: string;
  readonly cardLabel: string;
  readonly suitKind: string;
  readonly comment: string | null;
}

interface StoredPlanning {
  readonly hostParticipantId: string;
  readonly scaleId: string;
  readonly scaleName: string;
  readonly settings: RoomSettings;
  readonly participants: readonly StoredParticipant[];
  readonly items: readonly StoredItem[];
  readonly rounds: readonly StoredRound[];
  readonly votes: readonly StoredVote[];
}

export interface LoadedRoom {
  readonly room: Room;
  readonly table: PlanningTable;
}

export interface RoomContext {
  readonly deps: UseCaseDependencies;
  readonly repos: TransactionRepos;
  readonly loaded: LoadedRoom;
  readonly now: Date;
}

export interface Committed<T extends object> {
  readonly kind: "done";
  readonly roomId: RoomId;
  readonly events: readonly RoomEvent[];
  readonly value: T;
}

export type MutationOutcome<T extends object> = { readonly kind: "replay" } | Committed<T>;

export function addMilliseconds(from: Date, milliseconds: number): Date {
  const createDate = from.constructor as new (epochMs: number) => Date;
  return new createDate(from.getTime() + milliseconds);
}

export function guestExpiry(now: Date): Date {
  return addMilliseconds(now, ANON_ROOM_TTL_MINUTES * MINUTE_MS);
}

export function withGuestActivity(room: Room, now: Date): Room {
  const expiresAt = room.kind === "guest" ? guestExpiry(now) : room.expiresAt;
  return Room.create({
    id: room.id,
    code: room.code,
    name: room.name,
    kind: room.kind,
    teamId: room.teamId,
    hostParticipantId: room.hostParticipantId,
    scale: room.scale,
    settings: room.settings,
    status: room.status,
    version: room.version,
    lastActivityAt: now,
    expiresAt,
    participants: room.participants,
  });
}

export async function limitIp(
  deps: UseCaseDependencies,
  ip: string,
  rule: RateLimitRule,
  useCase: string,
): Promise<Result<true, AppError>> {
  const hit = await deps.rateLimiter.hit(ip, rule);
  if (!hit.ok) {
    warn(deps, useCase, hit.error);
    return hit;
  }
  return ok(true);
}

export async function limitParticipant(
  deps: UseCaseDependencies,
  participantId: string,
  useCase: string,
): Promise<Result<true, AppError>> {
  const hit = await deps.rateLimiter.hit(participantId, MUTATION_RULE);
  if (!hit.ok) {
    warn(deps, useCase, hit.error);
    return hit;
  }
  return ok(true);
}

export function warn(deps: UseCaseDependencies, useCase: string, error: AppError, roomId?: RoomId): void {
  const entry: LogEntry = { event: "use_case.failed", useCase, errorCode: error.code };
  if (roomId === undefined) {
    deps.logger.warn(entry);
    return;
  }
  deps.logger.warn({ ...entry, roomId });
}

export async function readLoaded(deps: UseCaseDependencies, code: string): Promise<Result<LoadedRoom, AppError>> {
  const parsed = RoomCode.create(code);
  if (!parsed.ok) return parsed;
  const loaded = await deps.persistence.transaction({}, async (repos) => hydrateIn(repos, parsed.value));
  return loaded;
}

const codeTails = new Map<string, Promise<void>>();

export function withCodeLock<T>(code: string, work: () => Promise<T>): Promise<T> {
  const key = code.trim().toUpperCase();
  const previous = codeTails.get(key) ?? Promise.resolve();
  const run = previous.then(work, work);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  codeTails.set(key, settled);
  return run;
}

export async function mutate<T extends object>(
  deps: UseCaseDependencies,
  code: string,
  useCase: string,
  work: (ctx: RoomContext) => Promise<Result<MutationOutcome<T>, AppError>>,
): Promise<Result<T & { realtimePending: boolean }, AppError>> {
  return withCodeLock(code, async () => {
    const result = await inLockedRoom(deps, code, work);
    return finishMutation(deps, result, useCase);
  });
}

export async function inLockedRoom<T>(
  deps: UseCaseDependencies,
  code: string,
  work: (ctx: RoomContext) => Promise<Result<T, AppError>>,
): Promise<Result<T, AppError>> {
  const parsed = RoomCode.create(code);
  if (!parsed.ok) return parsed;
  const peeked = await deps.persistence.transaction({}, async (repos) => ok(await repos.rooms.findByCode(parsed.value)));
  if (!peeked.ok) return peeked;
  if (peeked.value === null) return err(createAppError("NOT_FOUND"));
  const roomId = peeked.value.id;
  return deps.persistence.transaction({ lockRoomId: roomId }, async (repos) => {
    const loaded = await hydrateIn(repos, parsed.value);
    if (!loaded.ok) return loaded;
    return work({ deps, repos, loaded: loaded.value, now: deps.clock.now() });
  });
}

export async function beginOp(
  ctx: RoomContext,
  actorId: string,
  clientOpId: string,
): Promise<Result<"fresh" | "replay", AppError>> {
  const ids = opIds(actorId, clientOpId);
  if (!ids.ok) return ids;
  const seen = await ctx.repos.idempotency.hasProcessed(ids.value.actorId, ids.value.clientOpId, ctx.now);
  return ok(seen ? "replay" : "fresh");
}

export async function finishOp(ctx: RoomContext, actorId: string, clientOpId: string): Promise<Result<void, AppError>> {
  const ids = opIds(actorId, clientOpId);
  if (!ids.ok) return ids;
  await ctx.repos.idempotency.record(ids.value.actorId, ids.value.clientOpId, ctx.now);
  return ok(undefined);
}

export async function saveRoom(repos: TransactionRepos, room: Room, table: PlanningTable): Promise<void> {
  await repos.rooms.save(toPersisted(room, table));
}

export async function commitPlanning<T extends object>(
  ctx: RoomContext,
  actorId: string,
  clientOpId: string,
  table: PlanningTable,
  events: readonly PlanningEvent[],
  value: T,
): Promise<Result<Committed<T>, AppError>> {
  const room = withGuestActivity(table.room, ctx.now);
  await saveRoom(ctx.repos, room, table);
  const recorded = await finishOp(ctx, actorId, clientOpId);
  if (!recorded.ok) return recorded;
  return ok({
    kind: "done",
    roomId: room.id,
    events: mapPlanning(events, room.id, ctx.loaded.room.version + 1),
    value,
  });
}

export async function commitAggregate<T extends object>(
  ctx: RoomContext,
  actorId: string,
  clientOpId: string,
  room: Room,
  table: PlanningTable,
  events: readonly RoomEvent[],
  value: T,
): Promise<Result<Committed<T>, AppError>> {
  const active = withGuestActivity(room, ctx.now);
  await saveRoom(ctx.repos, active, table);
  const recorded = await finishOp(ctx, actorId, clientOpId);
  if (!recorded.ok) return recorded;
  return ok({ kind: "done", roomId: active.id, events, value });
}

export function replay<T extends object>(): Result<MutationOutcome<T>, AppError> {
  return ok({ kind: "replay" });
}

export async function deliver<T extends object>(
  deps: UseCaseDependencies,
  committed: Committed<T>,
): Promise<Result<T & { realtimePending: boolean }, AppError>> {
  let realtimePending = false;
  try {
    for (const event of committed.events) {
      const published = await deps.realtime.publish(committed.roomId, event);
      if (!published.ok) {
        realtimePending = true;
        break;
      }
    }
  } catch {
    realtimePending = true;
  }
  return ok({ ...committed.value, realtimePending });
}

export async function finishMutation<T extends object>(
  deps: UseCaseDependencies,
  result: Result<MutationOutcome<T>, AppError>,
  useCase: string,
): Promise<Result<T & { realtimePending: boolean }, AppError>> {
  if (!result.ok) {
    warn(deps, useCase, result.error);
    return result;
  }
  if (result.value.kind === "replay") return ok({ realtimePending: false } as T & { realtimePending: boolean });
  return deliver(deps, result.value);
}

export function mapPlanning(events: readonly PlanningEvent[], roomId: RoomId, version: number): RoomEvent[] {
  const wired: RoomEvent[] = [];
  for (const event of events) {
    const mapped = mapPlanningEvent(event, roomId, version);
    if (mapped) wired.push(mapped);
  }
  return wired;
}

export function participantJoined(roomId: RoomId, version: number, at: string, participantId: ParticipantId): RoomEvent {
  return { type: "participant.joined", roomId, version, at, payload: { participantId } };
}

export function participantUpdated(roomId: RoomId, version: number, at: string, participantId: ParticipantId): RoomEvent {
  return { type: "participant.updated", roomId, version, at, payload: { participantId } };
}

export function hostTransferred(
  roomId: RoomId,
  version: number,
  at: string,
  fromParticipantId: ParticipantId,
  toParticipantId: ParticipantId,
): RoomEvent {
  return {
    type: "host.transferred",
    roomId,
    version,
    at,
    payload: { fromParticipantId, toParticipantId },
  };
}

export function settingsUpdated(roomId: RoomId, version: number, at: string, name: string): RoomEvent {
  return { type: "room.settings_updated", roomId, version, at, payload: { name } };
}

export function authorize(
  room: Room,
  actorParticipantId: string,
  action: PolicyAction,
): Result<Room["participants"][number], AppError> {
  const participant = room.participants.find((seat) => seat.id === actorParticipantId);
  if (!participant) return err(createAppError("NOT_FOUND"));
  if (!can(actorOf(room, participant), action, contextOf(room, participant.id))) {
    return err(createAppError("FORBIDDEN"));
  }
  return ok(participant);
}

export function itemPropsOf(item: {
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
}): ItemProps {
  return {
    id: item.id,
    roomId: item.roomId,
    teamId: item.teamId,
    title: item.title,
    description: item.description,
    externalUrl: item.externalUrl,
    externalKey: item.externalKey,
    position: item.position,
    status: item.status,
    figureTag: item.figureTag,
    finalEstimate: item.finalEstimate,
    finalSuit: item.finalSuit,
  };
}

export function freshItem(room: Room, title: string, description: string, position: number, id: string): Result<ItemProps, AppError> {
  const built = new ItemBuilder()
    .withId(id)
    .withRoomId(room.id)
    .withTeamId(room.teamId)
    .withTitle(title)
    .withDescription(description)
    .withPosition(position)
    .build();
  if (!built.ok) return built;
  return ok(itemPropsOf(built.value));
}

function opIds(actorId: string, clientOpId: string): Result<{ actorId: ParticipantId; clientOpId: ClientOpId }, AppError> {
  const actor = ParticipantId.create(actorId);
  if (!actor.ok) return actor;
  const op = ClientOpId.create(clientOpId);
  if (!op.ok) return op;
  return ok({ actorId: actor.value, clientOpId: op.value });
}

async function hydrateIn(repos: TransactionRepos, code: RoomCode): Promise<Result<LoadedRoom, AppError>> {
  const record = await repos.rooms.findByCode(code);
  if (record === null) return err(createAppError("NOT_FOUND"));
  return hydrate(record);
}

function hydrate(record: PersistedRoomRecord): Result<LoadedRoom, AppError> {
  const planning = planningOf(record);
  if (planning === null) return err(createAppError("VALIDATION"));
  const scale = ScaleBuilder.fibonacci().withId(planning.scaleId).withName(planning.scaleName).build();
  if (!scale.ok) return scale;
  const hostId = ParticipantId.create(planning.hostParticipantId);
  if (!hostId.ok) return hostId;
  const participants = [];
  for (const stored of planning.participants) {
    const id = ParticipantId.create(stored.id);
    if (!id.ok) return id;
    const userId = stored.userId === null ? null : UserId.create(stored.userId);
    if (userId !== null && !userId.ok) return userId;
    participants.push(
      Participant.create({
        id: id.value,
        roomId: record.id,
        userId: userId === null ? null : userId.value,
        guestSessionId: stored.guestSessionId,
        nickname: stored.nickname,
        role: stored.role,
        mode: stored.mode,
        isFacilitator: stored.isFacilitator,
        joinedAt: stored.joinedAt,
        lastSeenAt: stored.lastSeenAt,
        afk: stored.afk,
      }),
    );
  }
  const room = Room.create({
    id: record.id,
    code: record.code,
    name: record.name,
    kind: record.kind,
    teamId: record.teamId,
    hostParticipantId: hostId.value,
    scale: scale.value,
    settings: planning.settings,
    status: record.status,
    version: record.version,
    lastActivityAt: record.lastActivityAt,
    expiresAt: record.expiresAt,
    participants,
  });
  const votes: VoteProps[] = [];
  for (const stored of planning.votes) {
    const suit = parseSuit(stored.suitKind);
    if (!suit.ok) return suit;
    votes.push({
      roundId: stored.roundId,
      participantId: stored.participantId,
      card: { label: stored.cardLabel, numeric: null, kind: "special" },
      suit: suit.value,
      comment: stored.comment,
    });
  }
  const rounds: RoundProps[] = planning.rounds.map((round) => ({
    id: round.id,
    roomId: round.roomId,
    itemId: round.itemId,
    number: round.number,
    status: round.status,
    timerEndsAt: round.timerEndsAt,
    stats: round.stats,
  }));
  const table = PlanningTable.rehydrate({
    room,
    items: planning.items.map((item) => itemPropsOf(item)),
    rounds,
    votes,
  });
  if (!table.ok) return table;
  return ok({ room, table: table.value });
}

function planningOf(record: PersistedRoomRecord): StoredPlanning | null {
  const extra = record as PersistedRoomRecord & { planning?: StoredPlanning };
  return extra.planning ?? null;
}

function toPersisted(room: Room, table: PlanningTable): PersistedRoomRecord {
  const planning: StoredPlanning = {
    hostParticipantId: room.hostParticipantId,
    scaleId: room.scale.id,
    scaleName: room.scale.name,
    settings: room.settings,
    participants: room.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      guestSessionId: participant.guestSessionId,
      nickname: participant.nickname,
      role: participant.role,
      mode: participant.mode,
      isFacilitator: participant.isFacilitator,
      joinedAt: participant.joinedAt,
      lastSeenAt: participant.lastSeenAt,
      afk: participant.afk,
    })),
    items: table.items.map((item) => itemPropsOf(item)),
    rounds: table.rounds.map((round) => ({
      id: round.id,
      roomId: round.roomId,
      itemId: round.itemId,
      number: round.number,
      status: round.status,
      timerEndsAt: round.timerEndsAt,
      stats: round.stats,
    })),
    votes: table.votes.map((vote) => ({
      roundId: vote.roundId,
      participantId: vote.participantId,
      cardLabel: vote.card.label,
      suitKind: vote.suit.kind,
      comment: vote.comment,
    })),
  };
  const record = {
    id: room.id,
    code: room.code,
    name: room.name,
    kind: room.kind,
    teamId: room.teamId,
    status: room.status,
    version: room.version,
    items: table.items.map((item) => ({ id: item.id as PersistedRoomRecord["items"][number]["id"], title: item.title })),
    expiresAt: room.expiresAt,
    lastActivityAt: room.lastActivityAt,
    planning,
  };
  return record as PersistedRoomRecord;
}

function mapPlanningEvent(event: PlanningEvent, roomId: RoomId, version: number): RoomEvent | null {
  const at = event.at;
  if (event.type === "vote.changed") {
    const participantId = ParticipantId.create(stringField(event.payload, "participantId") ?? "");
    if (!participantId.ok) return null;
    return {
      type: "vote.changed",
      roomId,
      version,
      at,
      payload: { participantId: participantId.value, hasVoted: event.payload.hasVoted === true },
    };
  }
  if (event.type === "round.revealed") {
    const roundId = RoundId.create(stringField(event.payload, "roundId") ?? "");
    if (!roundId.ok) return null;
    return { type: "round.revealed", roomId, version, at, payload: { roundId: roundId.value } };
  }
  if (event.type === "round.started") {
    const roundId = RoundId.create(stringField(event.payload, "roundId") ?? "");
    const itemId = ItemId.create(stringField(event.payload, "itemId") ?? "");
    if (!roundId.ok || !itemId.ok) return null;
    return { type: "round.started", roomId, version, at, payload: { roundId: roundId.value, itemId: itemId.value } };
  }
  if (event.type === "timer.updated") {
    const endsAt = event.payload.endsAt;
    return {
      type: "timer.updated",
      roomId,
      version,
      at,
      payload: { endsAt: endsAt === null || typeof endsAt === "string" ? endsAt : null },
    };
  }
  if (event.type === "item.queue_updated") {
    const rawIds = stringList(event.payload.itemIds);
    if (rawIds === null) return null;
    const itemIds = [];
    for (const raw of rawIds) {
      const itemId = ItemId.create(raw);
      if (!itemId.ok) return null;
      itemIds.push(itemId.value);
    }
    return { type: "item.queue_updated", roomId, version, at, payload: { itemIds } };
  }
  if (event.type === "item.estimate_finalized") {
    const itemId = ItemId.create(stringField(event.payload, "itemId") ?? "");
    if (!itemId.ok) return null;
    return { type: "item.estimate_finalized", roomId, version, at, payload: { itemId: itemId.value } };
  }
  return null;
}

function stringField(payload: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    ids.push(entry);
  }
  return ids;
}

function actorOf(room: Room, participant: Room["participants"][number]): PolicyActor {
  const seat = {
    isHost: participant.id === room.hostParticipantId,
    isFacilitator: participant.isFacilitator,
    roomMode: participant.mode,
  };
  if (room.kind === "guest") return { kind: "guest", ...seat };
  return { kind: "member", teamRole: teamRoleOf(participant.role), ...seat };
}

function teamRoleOf(role: string): PolicyActor["teamRole"] {
  if (role === "teamAdmin" || role === "pm" || role === "po" || role === "dev" || role === "qa" || role === "observer") {
    return role;
  }
  return undefined;
}

function contextOf(room: Room, participantId: string): { roomKind: Room["kind"]; actorCreatedRoom: boolean } {
  return {
    roomKind: room.kind,
    actorCreatedRoom: room.kind === "guest" && room.hostParticipantId === participantId,
  };
}
