import { Room, TeamId, createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import { inLockedRoom, saveRoom, warn, type UseCaseDependencies } from "../room-session.js";

export interface ClaimRoomInput {
  readonly roomCode: string;
  readonly hostToken: string;
  readonly teamId: string;
}

export interface ClaimRoomResult {
  readonly roomId: string;
  readonly teamId: string;
}

export class ClaimRoom {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ClaimRoomInput): Promise<Result<ClaimRoomResult, AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const hash = this.deps.ids.sha256(input.hostToken);
    const claimed = await inLockedRoom(this.deps, input.roomCode, async (ctx) => {
      const team = await ctx.repos.teams.findById(teamId.value);
      if (!team) return err(createAppError("NOT_FOUND"));
      const host = ctx.loaded.room.participants.find((participant) => participant.id === ctx.loaded.room.hostParticipantId);
      if (!host || host.guestSessionId !== hash) return err(createAppError("FORBIDDEN"));
      const room = Room.create({
        id: ctx.loaded.room.id,
        code: ctx.loaded.room.code,
        name: ctx.loaded.room.name,
        kind: "team",
        teamId: teamId.value,
        hostParticipantId: ctx.loaded.room.hostParticipantId,
        scale: ctx.loaded.room.scale,
        settings: ctx.loaded.room.settings,
        status: ctx.loaded.room.status,
        version: ctx.loaded.room.version,
        lastActivityAt: ctx.loaded.room.lastActivityAt,
        expiresAt: null,
        participants: ctx.loaded.room.participants,
      });
      await saveRoom(ctx.repos, room, ctx.loaded.table);
      return ok({ roomId: room.id, teamId: teamId.value });
    });
    if (!claimed.ok) warn(this.deps, "ClaimRoom", claimed.error);
    return claimed;
  }
}
