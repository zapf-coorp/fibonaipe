import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT_CREATE_ROOM,
  RATE_LIMIT_JOIN_ATTEMPTS,
  RATE_LIMIT_MUTATIONS,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import type { RateLimiter } from "@fibonaipe/application";

export interface RateLimiterContractHarness {
  readonly limiter: RateLimiter;
  now(): Date;
  advanceSeconds(seconds: number): void;
}

export function describeRateLimiterContract(name: string, factory: () => RateLimiterContractHarness): void {
  describe(name, () => {
    it("allows the create-room quota and rejects the next hit with retryAfterSec", async () => {
      const { limiter, now } = factory();
      const rule = {
        id: "create_room",
        limit: RATE_LIMIT_CREATE_ROOM.limit,
        windowSeconds: RATE_LIMIT_CREATE_ROOM.windowSeconds,
      };
      expect(rule.limit).toBe(10);
      expect(rule.windowSeconds).toBe(3600);
      const started = now().getTime();

      for (let hit = 1; hit <= rule.limit; hit += 1) {
        const result = await limiter.hit("ip:203.0.113.5", rule);
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.error.messageKey);
        expect(result.value).toMatchObject({
          allowed: true,
          remaining: rule.limit - hit,
          limit: rule.limit,
          retryAfterSec: 0,
        });
        expect(result.value.resetAt).toBeInstanceOf(Date);
        expect(result.value.resetAt.getTime()).toBe(started + rule.windowSeconds * 1000);
      }

      const blocked = await limiter.hit("ip:203.0.113.5", rule);
      expectAppError(blocked, "RATE_LIMITED", { retryAfterSec: 3600 });
    });

    it("keeps a hit that is exactly windowSeconds old and allows a new hit one second later", async () => {
      const harness = factory();
      const rule = {
        id: "create_room",
        limit: RATE_LIMIT_CREATE_ROOM.limit,
        windowSeconds: RATE_LIMIT_CREATE_ROOM.windowSeconds,
      };
      for (let hit = 0; hit < rule.limit; hit += 1) {
        expect((await harness.limiter.hit("ip:203.0.113.5", rule)).ok).toBe(true);
      }

      harness.advanceSeconds(rule.windowSeconds);
      const onBoundary = await harness.limiter.hit("ip:203.0.113.5", rule);
      expectAppError(onBoundary, "RATE_LIMITED", { retryAfterSec: 0 });

      harness.advanceSeconds(1);
      const recovered = await harness.limiter.hit("ip:203.0.113.5", rule);
      expect(recovered.ok).toBe(true);
      if (!recovered.ok) throw new Error(recovered.error.messageKey);
      expect(recovered.value).toMatchObject({ allowed: true, remaining: rule.limit - 1, retryAfterSec: 0 });
    });

    it("isolates quota by key and by rule id", async () => {
      const { limiter } = factory();
      const createRoom = {
        id: "create_room",
        limit: RATE_LIMIT_CREATE_ROOM.limit,
        windowSeconds: RATE_LIMIT_CREATE_ROOM.windowSeconds,
      };
      const otherRule = { id: "other_rule", limit: 1, windowSeconds: 60 };
      for (let hit = 0; hit < createRoom.limit; hit += 1) {
        expect((await limiter.hit("ip:1", createRoom)).ok).toBe(true);
      }
      expectAppError(await limiter.hit("ip:1", createRoom), "RATE_LIMITED", { retryAfterSec: 3600 });

      const otherIp = await limiter.hit("ip:2", createRoom);
      expect(otherIp.ok).toBe(true);
      if (!otherIp.ok) throw new Error(otherIp.error.messageKey);
      expect(otherIp.value.remaining).toBe(createRoom.limit - 1);

      const other = await limiter.hit("ip:1", otherRule);
      expect(other.ok).toBe(true);
      if (!other.ok) throw new Error(other.error.messageKey);
      expect(other.value.remaining).toBe(0);
    });

    it("resets one key without clearing another key", async () => {
      const { limiter } = factory();
      const rule = { id: "create_room", limit: 1, windowSeconds: 3600 };
      expect((await limiter.hit("ip:1", rule)).ok).toBe(true);
      expect((await limiter.hit("ip:2", rule)).ok).toBe(true);
      expectAppError(await limiter.hit("ip:1", rule), "RATE_LIMITED", { retryAfterSec: 3600 });

      await limiter.reset("ip:1", rule.id);
      const restored = await limiter.hit("ip:1", rule);
      expect(restored.ok).toBe(true);
      if (!restored.ok) throw new Error(restored.error.messageKey);
      expect(restored.value.remaining).toBe(0);
      expectAppError(await limiter.hit("ip:2", rule), "RATE_LIMITED", { retryAfterSec: 3600 });
    });

    it("enforces join and mutation quotas from the operational constants", async () => {
      const { limiter } = factory();
      expect(RATE_LIMIT_JOIN_ATTEMPTS.limit).toBe(20);
      expect(RATE_LIMIT_JOIN_ATTEMPTS.windowSeconds).toBe(60);
      expect(RATE_LIMIT_MUTATIONS.limit).toBe(60);
      expect(RATE_LIMIT_MUTATIONS.windowSeconds).toBe(60);

      const join = { id: "join_attempts", limit: RATE_LIMIT_JOIN_ATTEMPTS.limit, windowSeconds: 60 };
      for (let hit = 0; hit < join.limit; hit += 1) {
        expect((await limiter.hit("ip:198.51.100.10", join)).ok).toBe(true);
      }
      expectAppError(await limiter.hit("ip:198.51.100.10", join), "RATE_LIMITED", { retryAfterSec: 60 });

      const mutations = {
        id: "mutations",
        limit: RATE_LIMIT_MUTATIONS.limit,
        windowSeconds: RATE_LIMIT_MUTATIONS.windowSeconds,
      };
      for (let hit = 0; hit < mutations.limit; hit += 1) {
        expect((await limiter.hit("participant:p-1", mutations)).ok).toBe(true);
      }
      expectAppError(await limiter.hit("participant:p-1", mutations), "RATE_LIMITED", { retryAfterSec: 60 });
    });
  });
}

function expectAppError(
  result: Result<unknown, AppError>,
  code: AppError["code"],
  params: Readonly<Record<string, string | number | boolean>>,
): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error(`expected ${code}`);
  expect(result.error.code).toBe(code);
  expect(result.error.messageKey).toBe(`errors.${code}`);
  expect(result.error.params).toEqual(params);
}
