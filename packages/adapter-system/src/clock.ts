import type { Clock } from "@fibonaipe/application";

export function createSystemClock(): Clock {
  return {
    now() {
      return new Date();
    },
  };
}
