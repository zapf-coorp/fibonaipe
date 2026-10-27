import type { Clock } from "@fibonaipe/application";

const DEFAULT_EPOCH_MS = Date.parse("2026-10-26T12:00:00.000Z");

export class FakeClock implements Clock {
  private currentMs: number;

  constructor(initial?: string | Date) {
    this.currentMs = resolveEpoch(initial);
  }

  now(): Date {
    return new Date(this.currentMs);
  }

  advanceMs(ms: number): Date {
    this.currentMs += ms;
    return this.now();
  }

  advanceSeconds(seconds: number): Date {
    return this.advanceMs(seconds * 1000);
  }

  set(date: Date | string): void {
    this.currentMs = resolveEpoch(date);
  }
}

function resolveEpoch(initial?: string | Date): number {
  const epoch =
    initial === undefined ? DEFAULT_EPOCH_MS : initial instanceof Date ? initial.getTime() : Date.parse(initial);
  if (Number.isNaN(epoch)) throw new Error("FakeClock received an invalid instant");
  return epoch;
}
