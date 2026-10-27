import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import { projectRoomForViewer, type RoomView } from "../../projections/room-view.js";
import { readLoaded, warn, type UseCaseDependencies } from "../room-session.js";

export interface ReconnectParticipantInput {
  readonly code: string;
  readonly sessionToken: string;
}

export interface ReconnectParticipantResult {
  readonly participantId: string;
  readonly view: RoomView;
}

export class ReconnectParticipant {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ReconnectParticipantInput): Promise<Result<ReconnectParticipantResult, AppError>> {
    const loaded = await readLoaded(this.deps, input.code);
    if (!loaded.ok) {
      warn(this.deps, "ReconnectParticipant", loaded.error);
      return loaded;
    }
    const tokenHash = this.deps.ids.sha256(input.sessionToken);
    const participant = loaded.value.room.participants.find((seat) => seat.guestSessionId === tokenHash);
    if (!participant) {
      const error = createAppError("FORBIDDEN");
      warn(this.deps, "ReconnectParticipant", error, loaded.value.room.id);
      return err(error);
    }
    const now = this.deps.clock.now();
    return ok({
      participantId: participant.id,
      view: projectRoomForViewer(
        loaded.value.room,
        loaded.value.table.items,
        loaded.value.table.rounds,
        loaded.value.table.votes,
        { kind: "participant", participantId: participant.id },
        now,
      ),
    });
  }
}
