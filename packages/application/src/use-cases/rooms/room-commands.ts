import {
  RoomSettingsBuilder,
  createAppError,
  err,
  ok,
  type AppError,
  type Result,
  type RoomSettings,
} from "@fibonaipe/domain";
import { projectRoomForViewer, type RoomView } from "../../projections/room-view.js";
import {
  beginOp,
  commitAggregate,
  hostTransferred,
  limitParticipant,
  mutate,
  readLoaded,
  replay,
  settingsUpdated,
  warn,
  type UseCaseDependencies,
} from "../room-session.js";

export interface RoomActorInput {
  readonly code: string;
  readonly actorParticipantId: string;
  readonly clientOpId: string;
}

export interface UpdateRoomSettingsInput extends RoomActorInput {
  readonly autoReveal?: boolean;
  readonly showAverage?: boolean;
  readonly timerSeconds?: number | null;
  readonly allowObserverComments?: boolean;
  readonly suitAxisEnabled?: boolean;
  readonly suitAxisLabelKey?: string;
}

export interface TransferHostInput extends RoomActorInput {
  readonly targetParticipantId: string;
}

export interface SnapshotViewer {
  readonly kind: "participant";
  readonly participantId: string;
}

export interface ScreenViewer {
  readonly kind: "screen";
}

export interface GetRoomSnapshotInput {
  readonly code: string;
  readonly since: number;
  readonly viewer: SnapshotViewer | ScreenViewer;
}

export type GetRoomSnapshotResult =
  | { readonly unchanged: true; readonly version: number }
  | { readonly unchanged: false; readonly view: RoomView };

export interface CommandResult {
  readonly realtimePending: boolean;
}

export class UpdateRoomSettings {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: UpdateRoomSettingsInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.actorParticipantId, "UpdateRoomSettings");
    if (!allowed.ok) return allowed;
    return mutate(this.deps, input.code, "UpdateRoomSettings", async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const settings = nextSettings(ctx.loaded.room.settings, input);
      if (!settings.ok) return settings;
      const updated = ctx.loaded.room.updateSettings({
        actorParticipantId: input.actorParticipantId,
        settings: settings.value,
        now: ctx.now,
      });
      if (!updated.ok) return updated;
      const version = ctx.loaded.room.version + 1;
      return commitAggregate(ctx, input.actorParticipantId, input.clientOpId, updated.value.room, ctx.loaded.table, [
        settingsUpdated(updated.value.room.id, version, ctx.now.toISOString(), updated.value.room.name),
      ], {});
    });
  }
}

export class TransferHost {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: TransferHostInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.actorParticipantId, "TransferHost");
    if (!allowed.ok) return allowed;
    return mutate(this.deps, input.code, "TransferHost", async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const previousHost = ctx.loaded.room.hostParticipantId;
      const updated = ctx.loaded.room.transferHost({
        actorParticipantId: input.actorParticipantId,
        targetParticipantId: input.targetParticipantId,
        now: ctx.now,
      });
      if (!updated.ok) return updated;
      const version = ctx.loaded.room.version + 1;
      return commitAggregate(ctx, input.actorParticipantId, input.clientOpId, updated.value.room, ctx.loaded.table, [
        hostTransferred(
          updated.value.room.id,
          version,
          ctx.now.toISOString(),
          previousHost,
          updated.value.room.hostParticipantId,
        ),
      ], {});
    });
  }
}

export class CloseRoom {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: RoomActorInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.actorParticipantId, "CloseRoom");
    if (!allowed.ok) return allowed;
    return mutate(this.deps, input.code, "CloseRoom", async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const closed = ctx.loaded.room.close({ actorParticipantId: input.actorParticipantId, now: ctx.now });
      if (!closed.ok) return closed;
      return commitAggregate(ctx, input.actorParticipantId, input.clientOpId, closed.value.room, ctx.loaded.table, [], {});
    });
  }
}

export class GetRoomSnapshot {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: GetRoomSnapshotInput): Promise<Result<GetRoomSnapshotResult, AppError>> {
    const loaded = await readLoaded(this.deps, input.code);
    if (!loaded.ok) {
      warn(this.deps, "GetRoomSnapshot", loaded.error);
      return loaded;
    }
    if (input.since === loaded.value.room.version) {
      return ok({ unchanged: true, version: loaded.value.room.version });
    }
    const now = this.deps.clock.now();
    return ok({
      unchanged: false,
      view: projectRoomForViewer(
        loaded.value.room,
        loaded.value.table.items,
        loaded.value.table.rounds,
        loaded.value.table.votes,
        input.viewer,
        now,
      ),
    });
  }
}

function nextSettings(current: RoomSettings, input: UpdateRoomSettingsInput): Result<RoomSettings, AppError> {
  const built = new RoomSettingsBuilder()
    .withActiveScaleId(current.activeScaleId)
    .withSuitAxis(input.suitAxisEnabled ?? current.suitAxisEnabled, input.suitAxisLabelKey ?? current.suitAxisLabelKey)
    .withAutoReveal(input.autoReveal ?? current.autoReveal)
    .withShowAverage(input.showAverage ?? current.showAverage)
    .withTimerSeconds(input.timerSeconds === undefined ? current.timerSeconds : input.timerSeconds)
    .withMaxParticipants(current.maxParticipants)
    .withAllowObserverComments(input.allowObserverComments ?? current.allowObserverComments)
    .build();
  if (!built.ok) return built;
  if (built.value.maxParticipants !== current.maxParticipants) return err(createAppError("VALIDATION"));
  return built;
}
