import {
  EstimateAuditId,
  ItemId,
  UserId,
  can,
  createAppError,
  err,
  ok,
  type AppError,
  type Result,
  type TeamRole,
} from "@fibonaipe/domain";
import type { PersistedRoomRecord } from "../../ports/persistence.port.js";
import type { UseCaseDependencies } from "../room-session.js";

const SPECIAL_CARDS = new Set(["?", "Coringa", "AFK"]);

export interface EditFinalEstimateInput {
  readonly itemId: string;
  readonly toCard: string;
  readonly actorId: string;
}

export class EditFinalEstimateWithAudit {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: EditFinalEstimateInput): Promise<Result<true, AppError>> {
    if (SPECIAL_CARDS.has(input.toCard)) return err(createAppError("VALIDATION"));
    const itemId = ItemId.create(input.itemId);
    if (!itemId.ok) return itemId;
    const actorId = UserId.create(input.actorId);
    if (!actorId.ok) return actorId;

    return this.deps.persistence.transaction({}, async (repos) => {
      const rows = await repos.history.query({ itemId: itemId.value });
      const current = rows[0];
      if (!current) return err(createAppError("NOT_FOUND"));
      const room = await repos.rooms.findById(current.roomId);
      if (!room) return err(createAppError("NOT_FOUND"));
      const memberships = await repos.memberships.listByUser(actorId.value);
      const membership = room.teamId === null ? undefined : memberships.find((entry) => entry.teamId === room.teamId);
      const seat = seatOf(room, input.actorId);
      const allowed = can(
        {
          kind: room.kind === "guest" ? "guest" : "member",
          teamRole: membership?.role,
          isHost: seat?.isHost === true,
          isFacilitator: seat?.isFacilitator === true,
          roomMode: "voter",
        },
        "setFinalEstimate",
        { roomKind: room.kind, actorCreatedRoom: false },
      );
      if (!allowed) return err(createAppError("FORBIDDEN"));

      for (const row of rows) {
        await repos.history.appendAggregated({ ...row, finalEstimate: input.toCard });
      }
      const auditId = EstimateAuditId.create(this.deps.ids.newId());
      if (!auditId.ok) return auditId;
      await repos.history.saveAudit({
        id: auditId.value,
        roomId: current.roomId,
        itemId: current.itemId,
        changedBy: actorId.value,
        at: this.deps.clock.now(),
        from: current.finalEstimate ?? null,
        to: input.toCard,
      });
      return ok(true);
    });
  }
}

function seatOf(
  room: PersistedRoomRecord,
  actorId: string,
): { readonly isHost: boolean; readonly isFacilitator: boolean } | undefined {
  const planning = (
    room as {
      planning?: {
        hostParticipantId?: string;
        participants?: readonly { id: string; userId: string | null; isFacilitator?: boolean; role?: TeamRole }[];
      };
    }
  ).planning;
  const participant = planning?.participants?.find((entry) => entry.userId === actorId);
  if (!participant) return undefined;
  return {
    isHost: participant.id === planning?.hostParticipantId,
    isFacilitator: participant.isFacilitator === true,
  };
}
