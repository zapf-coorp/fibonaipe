import { describeRateLimiterContract } from "../../testing/src/contracts/rate-limiter.contract.js";
import { FakeClock } from "@fibonaipe/testing";
import { createInMemoryRateLimiter } from "./rate-limiter.js";

describeRateLimiterContract("system rate limiter", () => {
  const clock = new FakeClock();
  return {
    limiter: createInMemoryRateLimiter(clock),
    now: () => clock.now(),
    advanceSeconds: (seconds) => {
      clock.advanceSeconds(seconds);
    },
  };
});
