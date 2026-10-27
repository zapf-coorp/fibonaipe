import { createAppError, type AppError } from "../shared/app-error.js";
import { HOST_GRACE_SECONDS, ONLINE_WINDOW_SECONDS } from "../shared/constants.js";
import type { ParticipantId, RoomCode, RoomId, TeamId, UserId } from "../shared/ids.js";
import { err, ok, type Result } from "../shared/result.js";
import type { Scale } from "../scales/scale.js";
import {
  Participant,
  nicknameKey,
  normalizeNickname,
  nullableSession,
  nullableUserId,
  type ParticipantMode,
} from "./participant.js";
import type { RoomSettings } from "./room-settings-builder.js";

export interface DomainEvent {
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface JoinInput {
  readonly participantId: ParticipantId;
  readonly nickname: string;
  readonly role: string;
  readonly mode: ParticipantMode;
  readonly guestSessionId?: string | null;
  readonly userId?: UserId | null;
  readonly now: Date;
  readonly afk?: boolean;
  readonly isFacilitator?: boolean;
}

export interface RejoinInput {
  readonly guestSessionId?: string | null;
  readonly userId?: UserId | null;
  readonly now: Date;
}

export interface JoinOk {
  readonly room: Room;
  readonly participant: Participant;
  readonly events: readonly DomainEvent[];
}

export interface MutationOk {
  readonly room: Room;
  readonly events: readonly DomainEvent[];
}

interface RoomState {
  readonly id: RoomId;
  readonly code: RoomCode;
  readonly name: string;
  readonly kind: "guest" | "team";
  readonly teamId: TeamId | null;
  readonly hostParticipantId: ParticipantId;
  readonly scale: Scale;
  readonly settings: RoomSettings;
  readonly status: "open" | "closed";
  readonly version: number;
  readonly lastActivityAt: Date;
  readonly expiresAt: Date | null;
  readonly participants: readonly Participant[];
}

const ROLE_RANK: Readonly<Record<string, number>> = {
  pm: 0,
  po: 1,
  dev: 2,
  qa: 3,
  observer: 4,
};

function roleRank(role: string): number {
  return ROLE_RANK[role] ?? 5;
}

function isOnline(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() <= ONLINE_WINDOW_SECONDS * 1000;
}

function hostGraceElapsed(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() > HOST_GRACE_SECONDS * 1000;
}

function domainEvent(type: string, payload: Record<string, unknown>): DomainEvent {
  return Object.freeze({ type, payload: Object.freeze(payload) });
}

function settingsPayload(settings: RoomSettings): Record<string, unknown> {
  return {
    activeScaleId: settings.activeScaleId,
    suitAxisEnabled: settings.suitAxisEnabled,
    suitAxisLabelKey: settings.suitAxisLabelKey,
    autoReveal: settings.autoReveal,
    showAverage: settings.showAverage,
    timerSeconds: settings.timerSeconds,
    maxParticipants: settings.maxParticipants,
    allowObserverComments: settings.allowObserverComments,
  };
}

function preferCandidate(current: Participant, candidate: Participant, byRole: boolean): Participant {
  if (!byRole) {
    return candidate.joinedAt.getTime() < current.joinedAt.getTime() ? candidate : current;
  }
  const roleDiff = roleRank(candidate.role) - roleRank(current.role);
  if (roleDiff < 0) return candidate;
  if (roleDiff === 0 && candidate.joinedAt.getTime() < current.joinedAt.getTime()) return candidate;
  return current;
}

function pickSuccessor(online: readonly Participant[]): Participant | undefined {
  const first = online[0];
  if (first === undefined) return undefined;
  const facilitators = online.filter((participant) => participant.isFacilitator);
  const pool = facilitators.length > 0 ? facilitators : online;
  const leader = pool[0] ?? first;
  let best = leader;
  const byRole = facilitators.length === 0;
  for (const candidate of pool.slice(1)) {
    best = preferCandidate(best, candidate, byRole);
  }
  return best;
}

export class Room {
  readonly id: RoomId;
  readonly code: RoomCode;
  readonly name: string;
  readonly kind: "guest" | "team";
  readonly teamId: TeamId | null;
  readonly hostParticipantId: ParticipantId;
  readonly scale: Scale;
  readonly settings: RoomSettings;
  readonly status: "open" | "closed";
  readonly version: number;
  readonly lastActivityAt: Date;
  readonly expiresAt: Date | null;
  readonly participants: readonly Participant[];

  private constructor(state: RoomState) {
    this.id = state.id;
    this.code = state.code;
    this.name = state.name;
    this.kind = state.kind;
    this.teamId = state.teamId;
    this.hostParticipantId = state.hostParticipantId;
    this.scale = state.scale;
    this.settings = state.settings;
    this.status = state.status;
    this.version = state.version;
    this.lastActivityAt = state.lastActivityAt;
    this.expiresAt = state.expiresAt;
    this.participants = state.participants;
    Object.freeze(this);
  }

  static create(state: RoomState): Room {
    return new Room({
      ...state,
      settings: Object.freeze({ ...state.settings }),
      participants: Object.freeze([...state.participants]),
    });
  }

  join(input: JoinInput): Result<JoinOk, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    const userId = nullableUserId(input.userId);
    const guestSessionId = nullableSession(input.guestSessionId);
    const existing = this.findIdentity(userId, guestSessionId);
    if (existing) return this.touch(existing, input.now, "participant.rejoined");

    const nickname = normalizeNickname(input.nickname);
    if (!nickname.ok) return nickname;
    if (this.nicknameTaken(nickname.value)) return err(createAppError("NICKNAME_TAKEN"));
    if (this.participants.length >= this.settings.maxParticipants) return err(createAppError("ROOM_FULL"));

    const participant = Participant.create({
      id: input.participantId,
      roomId: this.id,
      userId,
      guestSessionId,
      nickname: nickname.value,
      role: input.role,
      mode: input.mode,
      isFacilitator: input.isFacilitator === true,
      joinedAt: input.now,
      lastSeenAt: input.now,
      afk: input.afk === true,
    });
    const room = this.revise({
      participants: Object.freeze([...this.participants, participant]),
      lastActivityAt: input.now,
    });
    return ok({
      room,
      participant,
      events: Object.freeze([
        domainEvent("participant.joined", { participantId: participant.id, nickname: participant.nickname }),
      ]),
    });
  }

  rejoin(input: RejoinInput): Result<JoinOk, AppError> {
    const userId = nullableUserId(input.userId);
    const guestSessionId = nullableSession(input.guestSessionId);
    if (userId === null && guestSessionId === null) return err(createAppError("VALIDATION"));
    const existing = this.findIdentity(userId, guestSessionId);
    if (!existing) return err(createAppError("NOT_FOUND"));
    return this.touch(existing, input.now, "participant.rejoined");
  }

  updateSettings(input: {
    actorParticipantId: string;
    settings: RoomSettings;
    now: Date;
  }): Result<MutationOk, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (input.actorParticipantId !== this.hostParticipantId) return err(createAppError("FORBIDDEN"));
    if (input.settings.maxParticipants !== this.settings.maxParticipants) {
      return err(createAppError("VALIDATION"));
    }
    const settings = Object.freeze({ ...input.settings });
    const room = this.revise({ settings, lastActivityAt: input.now });
    return ok({
      room,
      events: Object.freeze([domainEvent("settings.changed", settingsPayload(settings))]),
    });
  }

  transferHost(input: {
    actorParticipantId: string;
    targetParticipantId: string;
    now: Date;
  }): Result<MutationOk, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (input.actorParticipantId !== this.hostParticipantId) return err(createAppError("FORBIDDEN"));
    const target = this.findParticipant(input.targetParticipantId);
    if (!target) return err(createAppError("NOT_FOUND"));
    if (!isOnline(target.lastSeenAt, input.now)) return err(createAppError("FORBIDDEN"));
    return this.changeHost(target.id, input.now, "manual");
  }

  autoTransferHost(now: Date): Result<MutationOk, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    const host = this.findParticipant(this.hostParticipantId);
    if (!host || !hostGraceElapsed(host.lastSeenAt, now)) {
      return ok({ room: this, events: Object.freeze([]) });
    }
    const online = this.participants.filter(
      (participant) => participant.id !== this.hostParticipantId && isOnline(participant.lastSeenAt, now),
    );
    const winner = pickSuccessor(online);
    if (!winner) return ok({ room: this, events: Object.freeze([]) });
    return this.changeHost(winner.id, now, "auto");
  }

  delegateFacilitator(input: {
    actorParticipantId: string;
    targetParticipantId: string;
    now: Date;
  }): Result<MutationOk, AppError> {
    const target = this.authorizedOnlineTarget(input.actorParticipantId, input.targetParticipantId, input.now);
    if (!target.ok) return target;
    const participants = Object.freeze(
      this.participants.map((participant) => {
        if (participant.id === target.value.id) return participant.withFacilitator(true);
        if (participant.isFacilitator) return participant.withFacilitator(false);
        return participant;
      }),
    );
    const room = this.revise({ participants, lastActivityAt: input.now });
    return ok({
      room,
      events: Object.freeze([
        domainEvent("facilitator.changed", { participantId: target.value.id, isFacilitator: true }),
      ]),
    });
  }

  revokeFacilitator(input: {
    actorParticipantId: string;
    targetParticipantId: string;
    now: Date;
  }): Result<MutationOk, AppError> {
    const target = this.authorizedOnlineTarget(input.actorParticipantId, input.targetParticipantId, input.now);
    if (!target.ok) return target;
    const participants = Object.freeze(
      this.participants.map((participant) =>
        participant.id === target.value.id ? participant.withFacilitator(false) : participant,
      ),
    );
    const room = this.revise({ participants, lastActivityAt: input.now });
    return ok({
      room,
      events: Object.freeze([
        domainEvent("facilitator.changed", { participantId: target.value.id, isFacilitator: false }),
      ]),
    });
  }

  close(input: { actorParticipantId: string; now: Date }): Result<MutationOk, AppError> {
    if (input.actorParticipantId !== this.hostParticipantId) return err(createAppError("FORBIDDEN"));
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    const room = this.revise({ status: "closed", lastActivityAt: input.now });
    return ok({
      room,
      events: Object.freeze([domainEvent("room.closed", { roomId: this.id })]),
    });
  }

  private authorizedOnlineTarget(
    actorParticipantId: string,
    targetParticipantId: string,
    now: Date,
  ): Result<Participant, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (actorParticipantId !== this.hostParticipantId) return err(createAppError("FORBIDDEN"));
    const target = this.findParticipant(targetParticipantId);
    if (!target) return err(createAppError("NOT_FOUND"));
    if (!isOnline(target.lastSeenAt, now)) return err(createAppError("FORBIDDEN"));
    return ok(target);
  }

  private changeHost(hostParticipantId: ParticipantId, now: Date, reason: "auto" | "manual"): Result<MutationOk, AppError> {
    const room = this.revise({ hostParticipantId, lastActivityAt: now });
    return ok({
      room,
      events: Object.freeze([domainEvent("host.changed", { reason, hostParticipantId })]),
    });
  }

  private touch(participant: Participant, now: Date, type: string): Result<JoinOk, AppError> {
    const refreshed = participant.withLastSeen(now);
    const participants = Object.freeze(
      this.participants.map((seat) => (seat.id === participant.id ? refreshed : seat)),
    );
    const room = this.revise({ participants, lastActivityAt: now });
    return ok({
      room,
      participant: refreshed,
      events: Object.freeze([domainEvent(type, { participantId: refreshed.id })]),
    });
  }

  private findIdentity(userId: UserId | null, guestSessionId: string | null): Participant | undefined {
    if (userId !== null) {
      return this.participants.find((participant) => participant.userId === userId);
    }
    if (guestSessionId !== null) {
      return this.participants.find((participant) => participant.guestSessionId === guestSessionId);
    }
    return undefined;
  }

  private findParticipant(id: string): Participant | undefined {
    return this.participants.find((participant) => participant.id === id);
  }

  private nicknameTaken(nickname: string): boolean {
    const key = nicknameKey(nickname);
    return this.participants.some((participant) => nicknameKey(participant.nickname) === key);
  }

  private revise(patch: {
    hostParticipantId?: ParticipantId;
    settings?: RoomSettings;
    status?: "open" | "closed";
    lastActivityAt?: Date;
    participants?: readonly Participant[];
  }): Room {
    return Room.create({
      id: this.id,
      code: this.code,
      name: this.name,
      kind: this.kind,
      teamId: this.teamId,
      hostParticipantId: patch.hostParticipantId ?? this.hostParticipantId,
      scale: this.scale,
      settings: patch.settings ?? this.settings,
      status: patch.status ?? this.status,
      version: this.version,
      lastActivityAt: patch.lastActivityAt ?? this.lastActivityAt,
      expiresAt: this.expiresAt,
      participants: patch.participants ?? this.participants,
    });
  }
}
