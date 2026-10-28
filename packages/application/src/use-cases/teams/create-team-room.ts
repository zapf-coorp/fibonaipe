import {
  ParticipantId,
  PlanningTable,
  RoomBuilder,
  RoomCode,
  RoomId,
  ScaleBuilder,
  UserId,
  defaultRoomSettings,
  ok,
  type AppError,
  type ParticipantMode,
  type Result,
} from "@fibonaipe/domain";
import { deliver, participantJoined, saveRoom, type UseCaseDependencies } from "../room-session.js";
import { requireTeamAction } from "./access.js";

export interface CreateTeamRoomInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly name: string;
  readonly mode: ParticipantMode;
}

export interface CreateTeamRoomResult {
  readonly allowGuests: true;
  readonly code: string;
}

export class CreateTeamRoom {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CreateTeamRoomInput): Promise<Result<CreateTeamRoomResult, AppError>> {
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "createTeamRoom");
    if (!allowed.ok) return allowed;
    const actorUserId = UserId.create(input.actorUserId);
    if (!actorUserId.ok) return actorUserId;
    const now = this.deps.clock.now();
    const roomId = RoomId.create(this.deps.ids.newId());
    if (!roomId.ok) return roomId;
    const participantId = ParticipantId.create(this.deps.ids.newId());
    if (!participantId.ok) return participantId;
    const code = RoomCode.create(this.deps.ids.newRoomCode());
    if (!code.ok) return code;
    const scale = ScaleBuilder.fibonacci().withId("fibonacci").withName("Fibonacci").build();
    if (!scale.ok) return scale;
    const built = new RoomBuilder()
      .withId(roomId.value)
      .withCode(code.value)
      .withName(input.name)
      .withKind("team")
      .withTeamId(allowed.value.teamId)
      .withScale(scale.value)
      .withSettings(defaultRoomSettings())
      .withHost({
        id: participantId.value,
        nickname: "Host",
        role: "teamAdmin",
        mode: input.mode,
        userId: actorUserId.value,
        guestSessionId: this.deps.ids.sha256(this.deps.ids.newToken()),
        joinedAt: now,
        lastSeenAt: now,
      })
      .withNow(now)
      .withVersion(1)
      .withExpiresAt(null)
      .build();
    if (!built.ok) return built;
    const table = PlanningTable.open(built.value);
    if (!table.ok) return table;
    const saved = await this.deps.persistence.transaction({ lockRoomId: roomId.value }, async (repos) => {
      await saveRoom(repos, built.value, table.value);
      return ok(true);
    });
    if (!saved.ok) return saved;
    return deliver(this.deps, {
      kind: "done",
      roomId: roomId.value,
      events: [participantJoined(roomId.value, 1, now.toISOString(), participantId.value)],
      value: { allowGuests: true, code: code.value },
    });
  }
}
