import type { AppError, Result } from "@fibonaipe/domain";

export interface RateLimitRule {
  readonly id: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateLimitStatus {
  readonly allowed: true;
  readonly remaining: number;
  readonly limit: number;
  readonly resetAt: Date;
  readonly retryAfterSec: 0;
}

export interface RateLimiter {
  hit(key: string, rule: RateLimitRule): Promise<Result<RateLimitStatus, AppError>>;
  reset(key: string, ruleId: string): Promise<void>;
}
