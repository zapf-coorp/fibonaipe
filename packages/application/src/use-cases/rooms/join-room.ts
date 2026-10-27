import { ParticipantId, type AppError, type ParticipantMode, type Result } from "@fibonaipe/domain";
import {
  JOIN_ATTEMPT_RULE,
  commitAggregate,
  limitIp,
  mutate,
  participantJoined,
  type UseCaseDependencies,
} from "../room-session.js";

export interface JoinRoomInput {
  readonly code: string;
  readonly nickname: string;
  readonly ip: string;
  readonly mode: ParticipantMode;
  readonly role: string;
  readonly clientOpId: string;
  readonly isFacilitator?: boolean;
  readonly afk?: boolean;
}

export interface JoinRoomResult {
  readonly sessionToken: string;
  readonly participantId: string;
  readonly realtimePending: boolean;
}

export class JoinRoom {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: JoinRoomInput): Promise<Result<JoinRoomResult, AppError>> {
    const allowed = await limitIp(this.deps, input.ip, JOIN_ATTEMPT_RULE, "JoinRoom");
    if (!allowed.ok) return allowed;

    const sessionToken = this.deps.ids.newToken();
    const tokenHash = this.deps.ids.sha256(sessionToken);
    const participantId = ParticipantId.create(this.deps.ids.newId());
    if (!participantId.ok) return participantId;

    return mutate(this.deps, input.code, "JoinRoom", async (ctx) => {
      const joined = ctx.loaded.room.join({
        participantId: participantId.value,
        nickname: input.nickname,
        role: input.role,
        mode: input.mode,
        guestSessionId: tokenHash,
        now: ctx.now,
        afk: input.afk === true,
        isFacilitator: input.isFacilitator === true,
      });
      if (!joined.ok) return joined;
      const version = ctx.loaded.room.version + 1;
      return commitAggregate(ctx, participantId.value, input.clientOpId, joined.value.room, ctx.loaded.table, [
        participantJoined(joined.value.room.id, version, ctx.now.toISOString(), joined.value.participant.id),
      ], { sessionToken, participantId: joined.value.participant.id });
    });
  }
}
