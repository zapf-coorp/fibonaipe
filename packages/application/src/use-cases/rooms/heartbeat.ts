import { createAppError, err, type AppError, type Result } from "@fibonaipe/domain";
import {
  beginOp,
  commitAggregate,
  hostTransferred,
  limitParticipant,
  mutate,
  participantUpdated,
  replay,
  type UseCaseDependencies,
} from "../room-session.js";

export interface HeartbeatInput {
  readonly code: string;
  readonly participantId: string;
  readonly clientOpId: string;
}

export interface HeartbeatResult {
  readonly realtimePending: boolean;
}

export class Heartbeat {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: HeartbeatInput): Promise<Result<HeartbeatResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.participantId, "Heartbeat");
    if (!allowed.ok) return allowed;

    return mutate(this.deps, input.code, "Heartbeat", async (ctx) => {
      const op = await beginOp(ctx, input.participantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const seat = ctx.loaded.room.participants.find((participant) => participant.id === input.participantId);
      if (!seat) return err(createAppError("NOT_FOUND"));
      if (seat.guestSessionId === null) return err(createAppError("FORBIDDEN"));
      const touched = ctx.loaded.room.rejoin({ guestSessionId: seat.guestSessionId, now: ctx.now });
      if (!touched.ok) return touched;
      const previousHost = touched.value.room.hostParticipantId;
      const transferred = touched.value.room.autoTransferHost(ctx.now);
      if (!transferred.ok) return transferred;
      const version = ctx.loaded.room.version + 1;
      const at = ctx.now.toISOString();
      const events = [participantUpdated(transferred.value.room.id, version, at, seat.id)];
      if (transferred.value.room.hostParticipantId !== previousHost) {
        events.push(
          hostTransferred(
            transferred.value.room.id,
            version,
            at,
            previousHost,
            transferred.value.room.hostParticipantId,
          ),
        );
      }
      return commitAggregate(
        ctx,
        input.participantId,
        input.clientOpId,
        transferred.value.room,
        ctx.loaded.table,
        events,
        {},
      );
    });
  }
}
