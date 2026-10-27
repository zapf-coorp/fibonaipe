import {
  ParticipantId,
  PlanningTable,
  RoomBuilder,
  RoomCode,
  RoomId,
  ScaleBuilder,
  defaultRoomSettings,
  ok,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import {
  CREATE_ROOM_RULE,
  deliver,
  guestExpiry,
  limitIp,
  participantJoined,
  saveRoom,
  type UseCaseDependencies,
} from "../room-session.js";

export interface CreateRoomInput {
  readonly name: string;
  readonly ip: string;
  readonly hostNickname: string;
}

export interface CreateRoomResult {
  readonly code: string;
  readonly hostToken: string;
  readonly participantId: string;
  readonly realtimePending: boolean;
}

export class CreateRoom {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CreateRoomInput): Promise<Result<CreateRoomResult, AppError>> {
    const allowed = await limitIp(this.deps, input.ip, CREATE_ROOM_RULE, "CreateRoom");
    if (!allowed.ok) return allowed;

    const now = this.deps.clock.now();
    const roomId = RoomId.create(this.deps.ids.newId());
    if (!roomId.ok) return roomId;
    const participantId = ParticipantId.create(this.deps.ids.newId());
    if (!participantId.ok) return participantId;
    const code = RoomCode.create(this.deps.ids.newRoomCode());
    if (!code.ok) return code;
    const scale = ScaleBuilder.fibonacci().withId("fibonacci").withName("Fibonacci").build();
    if (!scale.ok) return scale;

    const hostToken = this.deps.ids.newToken();
    const tokenHash = this.deps.ids.sha256(hostToken);
    const built = new RoomBuilder()
      .withId(roomId.value)
      .withCode(code.value)
      .withName(input.name)
      .withKind("guest")
      .withTeamId(null)
      .withScale(scale.value)
      .withSettings(defaultRoomSettings())
      .withHost({
        id: participantId.value,
        nickname: input.hostNickname,
        role: "dev",
        mode: "voter",
        guestSessionId: tokenHash,
        joinedAt: now,
        lastSeenAt: now,
      })
      .withNow(now)
      .withVersion(1)
      .withExpiresAt(guestExpiry(now))
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
      value: { code: code.value, hostToken, participantId: participantId.value },
    });
  }
}
