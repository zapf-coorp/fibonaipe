import { createAppError, type AppError } from "../shared/app-error.js";
import { MAX_NICKNAME_LENGTH, MIN_NICKNAME_LENGTH } from "../shared/constants.js";
import { err, ok, type Result } from "../shared/result.js";
import type { ParticipantId, RoomId, UserId } from "../shared/ids.js";

export type ParticipantMode = "voter" | "observer";

export interface ParticipantProps {
  readonly id: ParticipantId;
  readonly roomId: RoomId;
  readonly userId: UserId | null;
  readonly guestSessionId: string | null;
  readonly nickname: string;
  readonly role: string;
  readonly mode: ParticipantMode;
  readonly isFacilitator: boolean;
  readonly joinedAt: Date;
  readonly lastSeenAt: Date;
  readonly afk: boolean;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || (code >= 127 && code <= 159)) return true;
  }
  return false;
}

export function normalizeNickname(raw: string): Result<string, AppError> {
  if (hasControlCharacter(raw)) return err(createAppError("VALIDATION"));
  const nickname = raw.trim();
  if (nickname.length < MIN_NICKNAME_LENGTH || nickname.length > MAX_NICKNAME_LENGTH) {
    return err(createAppError("VALIDATION"));
  }
  return ok(nickname);
}

export function nicknameKey(nickname: string): string {
  return nickname.toLocaleLowerCase("pt-BR");
}

function nullableText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  return value;
}

export function nullableUserId(value: UserId | null | undefined): UserId | null {
  if (typeof value !== "string") return null;
  return value;
}

export function nullableSession(value: string | null | undefined): string | null {
  return nullableText(value);
}

export class Participant {
  readonly id: ParticipantId;
  readonly roomId: RoomId;
  readonly userId: UserId | null;
  readonly guestSessionId: string | null;
  readonly nickname: string;
  readonly role: string;
  readonly mode: ParticipantMode;
  readonly isFacilitator: boolean;
  readonly joinedAt: Date;
  readonly lastSeenAt: Date;
  readonly afk: boolean;
  readonly canVote: boolean;

  private constructor(props: ParticipantProps) {
    this.id = props.id;
    this.roomId = props.roomId;
    this.userId = props.userId;
    this.guestSessionId = props.guestSessionId;
    this.nickname = props.nickname;
    this.role = props.role;
    this.mode = props.mode;
    this.isFacilitator = props.isFacilitator;
    this.joinedAt = props.joinedAt;
    this.lastSeenAt = props.lastSeenAt;
    this.afk = props.afk;
    this.canVote = props.mode === "voter" && props.afk === false;
    Object.freeze(this);
  }

  static create(props: ParticipantProps): Participant {
    return new Participant(props);
  }

  withLastSeen(lastSeenAt: Date): Participant {
    return new Participant({ ...this.toProps(), lastSeenAt });
  }

  withFacilitator(isFacilitator: boolean): Participant {
    return new Participant({ ...this.toProps(), isFacilitator });
  }

  private toProps(): ParticipantProps {
    return {
      id: this.id,
      roomId: this.roomId,
      userId: this.userId,
      guestSessionId: this.guestSessionId,
      nickname: this.nickname,
      role: this.role,
      mode: this.mode,
      isFacilitator: this.isFacilitator,
      joinedAt: this.joinedAt,
      lastSeenAt: this.lastSeenAt,
      afk: this.afk,
    };
  }
}
