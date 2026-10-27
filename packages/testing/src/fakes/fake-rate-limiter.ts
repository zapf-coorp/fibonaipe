import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { Clock, RateLimitRule, RateLimitStatus, RateLimiter } from "@fibonaipe/application";

export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly clock: Clock) {}

  async hit(key: string, rule: RateLimitRule): Promise<Result<RateLimitStatus, AppError>> {
    const nowMs = this.clock.now().getTime();
    const windowMs = rule.windowSeconds * 1000;
    const cutoff = nowMs - windowMs;
    const bucketKey = `${rule.id}\u0000${key}`;
    const active = (this.hits.get(bucketKey) ?? []).filter((stamp) => stamp >= cutoff);

    if (active.length >= rule.limit) {
      const oldest = active[0] ?? nowMs;
      const retryAfterSec = Math.max(0, Math.ceil((oldest + windowMs - nowMs) / 1000));
      this.hits.set(bucketKey, active);
      return err(createAppError("RATE_LIMITED", "errors.RATE_LIMITED", { retryAfterSec }));
    }

    active.push(nowMs);
    this.hits.set(bucketKey, active);
    return ok({
      allowed: true,
      remaining: rule.limit - active.length,
      limit: rule.limit,
      resetAt: new Date(nowMs + windowMs),
      retryAfterSec: 0,
    });
  }

  async reset(key: string, ruleId: string): Promise<void> {
    this.hits.delete(`${ruleId}\u0000${key}`);
  }
}
