import { ANON_ROOM_TTL_MINUTES, ClientOpId, ParticipantId, PlanningTable, RATE_LIMIT_CREATE_ROOM, RATE_LIMIT_JOIN_ATTEMPTS, RATE_LIMIT_MUTATIONS, Room, RoomCode, RoomId, can, createAppError, err, ok, type AppError, type PlanningEvent, type PolicyAction, type PolicyActor, type Result } from "@fibonaipe/domain";
import type { Clock } from "../ports/clock.port.js";
import type { Exporter } from "../ports/exporter.port.js";
import type { IdGenerator } from "../ports/id-generator.port.js";
import type { IssueTracker } from "../ports/issue-tracker.port.js";
import type { LogEntry, StructuredLogger } from "../ports/logger.port.js";
import type { Persistence, TransactionRepos } from "../ports/persistence.port.js";
import type { RateLimitRule, RateLimiter } from "../ports/rate-limiter.port.js";
import type { RealtimePublisher } from "../ports/realtime.port.js";
import type { RoomEvent } from "../projections/events.js";
import { LoadedRoom, hydrate, toPersisted } from "./room-hydration.js";
import { mapPlanning } from "./room-events.js";

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

export * from "./room-hydration.js";
export * from "./room-events.js";
