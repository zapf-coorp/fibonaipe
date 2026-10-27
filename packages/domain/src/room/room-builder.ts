import { createAppError, type AppError } from "../shared/app-error.js";
import { MAX_PARTICIPANTS } from "../shared/constants.js";
import type { ParticipantId, RoomCode, RoomId, TeamId, UserId } from "../shared/ids.js";
import { err, ok, type Result } from "../shared/result.js";
import type { Scale } from "../scales/scale.js";
import { Participant, normalizeNickname, nullableSession, nullableUserId, type ParticipantMode } from "./participant.js";
import { Room } from "./room.js";
import { defaultRoomSettings, type RoomSettings } from "./room-settings-builder.js";

export interface RoomHostSeed {
  readonly id: ParticipantId;
  readonly nickname: string;
  readonly role: string;
  readonly mode: ParticipantMode;
  readonly guestSessionId?: string | null;
  readonly userId?: UserId | null;
  readonly joinedAt: Date;
  readonly lastSeenAt: Date;
  readonly afk?: boolean;
  readonly isFacilitator?: boolean;
}

export class RoomBuilder {
  private id: RoomId | undefined;
  private code: RoomCode | undefined;
  private name = "";
  private kind: "guest" | "team" = "guest";
  private teamId: TeamId | null = null;
  private scale: Scale | undefined;
  private settings: RoomSettings = defaultRoomSettings();
  private host: RoomHostSeed | undefined;
  private now: Date | undefined;
  private version = 1;
  private expiresAt: Date | null = null;

  withId(id: RoomId): this {
    this.id = id;
    return this;
  }

  withCode(code: RoomCode): this {
    this.code = code;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withKind(kind: "guest" | "team"): this {
    this.kind = kind;
    return this;
  }

  withTeamId(teamId: TeamId | null): this {
    this.teamId = teamId;
    return this;
  }

  withScale(scale: Scale): this {
    this.scale = scale;
    return this;
  }

  withSettings(settings: RoomSettings): this {
    this.settings = settings;
    return this;
  }

  withHost(host: RoomHostSeed): this {
    this.host = host;
    return this;
  }

  withNow(now: Date): this {
    this.now = now;
    return this;
  }

  withVersion(version: number): this {
    this.version = version;
    return this;
  }

  withExpiresAt(expiresAt: Date | null): this {
    this.expiresAt = expiresAt;
    return this;
  }

  build(): Result<Room, AppError> {
    const name = this.name.trim();
    if (name.length === 0 || !this.id || !this.code || !this.scale || !this.host || !this.now) {
      return err(createAppError("VALIDATION"));
    }
    if (this.kind === "team" && this.teamId === null) return err(createAppError("VALIDATION"));
    if (this.settings.maxParticipants !== MAX_PARTICIPANTS) return err(createAppError("VALIDATION"));
    const nickname = normalizeNickname(this.host.nickname);
    if (!nickname.ok) return nickname;

    const id = this.id;
    const code = this.code;
    const scale = this.scale;
    const host = this.host;
    const now = this.now;
    const participant = Participant.create({
      id: host.id,
      roomId: id,
      userId: nullableUserId(host.userId),
      guestSessionId: nullableSession(host.guestSessionId),
      nickname: nickname.value,
      role: host.role,
      mode: host.mode,
      isFacilitator: host.isFacilitator === true,
      joinedAt: host.joinedAt,
      lastSeenAt: host.lastSeenAt,
      afk: host.afk === true,
    });

    return ok(
      Room.create({
        id,
        code,
        name,
        kind: this.kind,
        teamId: this.kind === "guest" ? null : this.teamId,
        hostParticipantId: host.id,
        scale,
        settings: this.settings,
        status: "open",
        version: this.version,
        lastActivityAt: now,
        expiresAt: this.expiresAt,
        participants: [participant],
      }),
    );
  }
}
