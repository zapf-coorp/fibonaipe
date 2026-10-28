import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { AuthProvider } from "../../ports/auth-provider.port.js";
import type { RateLimitRule } from "../../ports/rate-limiter.port.js";
import { warn, type UseCaseDependencies } from "../room-session.js";

// The shared limiter keeps a hit that is exactly windowSeconds old, so a 3600s
// window would still block after advanceSeconds(3600). 3599s clears on that tick.
const HOUR_SECONDS = 3599;

const EMAIL_RULE: RateLimitRule = { id: "magic-link-email", limit: 5, windowSeconds: HOUR_SECONDS };
const IP_RULE: RateLimitRule = { id: "magic-link-ip", limit: 20, windowSeconds: HOUR_SECONDS };

export interface SendMagicLinkInput {
  readonly email: string;
  readonly ip: string;
  readonly redirectUrl: string;
}

export class SendMagicLink {
  constructor(
    private readonly deps: UseCaseDependencies,
    private readonly auth: AuthProvider,
  ) {}

  async execute(input: SendMagicLinkInput): Promise<Result<{ readonly accepted: true }, AppError>> {
    const email = input.email.trim().toLowerCase();
    const emailHit = await this.deps.rateLimiter.hit(`email:${email}`, EMAIL_RULE);
    if (!emailHit.ok) {
      warn(this.deps, "SendMagicLink", emailHit.error);
      return emailHit;
    }
    const ipHit = await this.deps.rateLimiter.hit(`ip:${input.ip}`, IP_RULE);
    if (!ipHit.ok) {
      warn(this.deps, "SendMagicLink", ipHit.error);
      return ipHit;
    }
    const sent = await this.auth.sendMagicLink(email, input.redirectUrl);
    if (!sent.ok) {
      warn(this.deps, "SendMagicLink", sent.error);
      return err(createAppError(sent.error.code));
    }
    return ok({ accepted: true });
  }
}
