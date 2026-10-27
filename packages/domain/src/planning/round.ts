import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";
import type { RoundStats } from "../stats/compute-round-stats.js";

export type RoundStatus = "voting" | "revealed";

export interface RoundProps {
  readonly id: string;
  readonly roomId: string;
  readonly itemId: string;
  readonly number: number;
  readonly status: RoundStatus;
  readonly timerEndsAt: Date | null;
  readonly stats: RoundStats | null;
}

function isRoundStatus(value: string): value is RoundStatus {
  return value === "voting" || value === "revealed";
}

export class Round {
  readonly id: string;
  readonly roomId: string;
  readonly itemId: string;
  readonly number: number;
  readonly status: RoundStatus;
  readonly timerEndsAt: Date | null;
  readonly stats: RoundStats | null;

  private constructor(props: RoundProps) {
    this.id = props.id;
    this.roomId = props.roomId;
    this.itemId = props.itemId;
    this.number = props.number;
    this.status = props.status;
    this.timerEndsAt = props.timerEndsAt;
    this.stats = props.stats;
    Object.freeze(this);
  }

  static rehydrate(input: {
    id: string;
    roomId: string;
    itemId: string;
    number: number;
    status: RoundStatus;
    timerEndsAt: Date | null;
    stats: RoundStats | null;
  }): Result<Round, AppError> {
    if (!isRoundStatus(input.status)) return err(createAppError("VALIDATION"));
    if (!Number.isInteger(input.number) || input.number < 1) return err(createAppError("VALIDATION"));
    if (input.status === "voting" && input.stats !== null) return err(createAppError("VALIDATION"));
    return ok(new Round(input));
  }

  static start(input: { id: string; roomId: string; itemId: string; number: number }): Round {
    return new Round({
      id: input.id,
      roomId: input.roomId,
      itemId: input.itemId,
      number: input.number,
      status: "voting",
      timerEndsAt: null,
      stats: null,
    });
  }

  reveal(stats: RoundStats): Round {
    return new Round({
      id: this.id,
      roomId: this.roomId,
      itemId: this.itemId,
      number: this.number,
      status: "revealed",
      timerEndsAt: this.timerEndsAt,
      stats,
    });
  }

  withTimer(timerEndsAt: Date | null): Round {
    return new Round({
      id: this.id,
      roomId: this.roomId,
      itemId: this.itemId,
      number: this.number,
      status: this.status,
      timerEndsAt,
      stats: this.stats,
    });
  }
}
