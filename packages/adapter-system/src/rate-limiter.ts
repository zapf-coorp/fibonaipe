import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { Clock, RateLimiter, RateLimitRule, RateLimitStatus } from "@fibonaipe/application";

export function createInMemoryRateLimiter(clock: Clock): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    async hit(key: string, rule: RateLimitRule): Promise<Result<RateLimitStatus, AppError>> {
      const nowMs = clock.now().getTime();
      const windowMs = rule.windowSeconds * 1000;
      const cutoff = nowMs - windowMs;
      const bucketKey = `${rule.id}\u0000${key}`;
      const active = (hits.get(bucketKey) ?? []).filter((stamp) => stamp >= cutoff);
      if (active.length >= rule.limit) {
        const oldest = active[0] ?? nowMs;
        const retryAfterSec = Math.max(0, Math.ceil((oldest + windowMs - nowMs) / 1000));
        hits.set(bucketKey, active);
        return err(createAppError("RATE_LIMITED", "errors.RATE_LIMITED", { retryAfterSec }));
      }
      active.push(nowMs);
      hits.set(bucketKey, active);
      return ok({
        allowed: true,
        remaining: rule.limit - active.length,
        limit: rule.limit,
        resetAt: new Date(nowMs + windowMs),
        retryAfterSec: 0,
      });
    },
    async reset(key: string, ruleId: string): Promise<void> {
      hits.delete(`${ruleId}\u0000${key}`);
    },
  };
}
