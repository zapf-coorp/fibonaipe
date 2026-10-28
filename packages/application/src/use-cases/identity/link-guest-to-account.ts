import { Participant, Room, UserId, createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import { inLockedRoom, saveRoom, type UseCaseDependencies } from "../room-session.js";

export interface LinkGuestToAccountInput {
  readonly roomCode: string;
  readonly sessionToken: string;
  readonly userId: string;
}

export interface LinkGuestToAccountResult {
  readonly userId: string;
  readonly participantId: string;
}

export class LinkGuestToAccount {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: LinkGuestToAccountInput): Promise<Result<LinkGuestToAccountResult, AppError>> {
    const userId = UserId.create(input.userId);
    if (!userId.ok) return userId;
    const hash = this.deps.ids.sha256(input.sessionToken);
    return inLockedRoom(this.deps, input.roomCode, async (ctx) => {
      const seat = ctx.loaded.room.participants.find((participant) => participant.guestSessionId === hash);
      if (!seat) return err(createAppError("FORBIDDEN"));
      const linked = Participant.create({
        id: seat.id,
        roomId: seat.roomId,
        userId: userId.value,
        guestSessionId: seat.guestSessionId,
        nickname: seat.nickname,
        role: seat.role,
        mode: seat.mode,
        isFacilitator: seat.isFacilitator,
        joinedAt: seat.joinedAt,
        lastSeenAt: seat.lastSeenAt,
        afk: seat.afk,
      });
      const room = Room.create({
        id: ctx.loaded.room.id,
        code: ctx.loaded.room.code,
        name: ctx.loaded.room.name,
        kind: ctx.loaded.room.kind,
        teamId: ctx.loaded.room.teamId,
        hostParticipantId: ctx.loaded.room.hostParticipantId,
        scale: ctx.loaded.room.scale,
        settings: ctx.loaded.room.settings,
        status: ctx.loaded.room.status,
        version: ctx.loaded.room.version,
        lastActivityAt: ctx.loaded.room.lastActivityAt,
        expiresAt: ctx.loaded.room.expiresAt,
        participants: ctx.loaded.room.participants.map((participant) => (participant.id === seat.id ? linked : participant)),
      });
      await saveRoom(ctx.repos, room, ctx.loaded.table);
      return ok({ userId: userId.value, participantId: seat.id });
    });
  }
}
