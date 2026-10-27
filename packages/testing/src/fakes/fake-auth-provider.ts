import { UserId, createAppError, err, ok, type AppError, type Result, type UserId as UserIdValue } from "@fibonaipe/domain";
import type { AuthProvider, AuthenticatedIdentity } from "@fibonaipe/application";

const VERIFIED_AT_MS = Date.parse("2026-10-26T12:00:00.000Z");
const GOOGLE_EMAIL = "google.user@example.com";

function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const match = /^([^@\s]+)@([^@\s]+)$/.exec(normalized);
  const domain = match?.[2];
  if (!match || !domain || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  return normalized;
}

interface StoredUser {
  readonly userId: UserIdValue;
  readonly email: string;
  readonly displayName: string;
  readonly emailVerifiedAt: Date;
  suspended: boolean;
}

interface MagicLink {
  readonly email: string;
  used: boolean;
}

export class FakeAuthProvider implements AuthProvider {
  private readonly users = new Map<string, StoredUser>();
  private readonly magicLinks = new Map<string, MagicLink>();
  private readonly googleCodes = new Map<string, boolean>();
  private readonly sessions = new Map<string, string>();
  private sequence = 0;
  private latestMagic = "";
  private latestGoogle = "";
  private latestSession = "";
  private currentEmail: string | null = null;

  async sendMagicLink(email: string, _redirectUrl: string): Promise<Result<{ challengeId: string }, AppError>> {
    const normalized = normalizeEmail(email);
    if (!normalized) return err(createAppError("VALIDATION"));
    const token = this.next("magic");
    this.magicLinks.set(token, { email: normalized, used: false });
    this.latestMagic = token;
    this.ensureUser(normalized);
    return ok({ challengeId: this.next("challenge") });
  }

  async verifyMagicLink(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const link = this.magicLinks.get(token);
    if (!link || link.used) return err(createAppError("AUTH_LINK_INVALID"));
    link.used = true;
    const user = this.ensureUser(link.email);
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    this.issueSession(link.email);
    return ok(this.identityFor(user));
  }

  getGoogleAuthUrl(state: string, redirectUrl: string): Result<{ url: string }, AppError> {
    const code = this.next("google");
    this.googleCodes.set(code, false);
    this.latestGoogle = code;
    const query = [
      `state=${encodeURIComponent(state)}`,
      `redirect_uri=${encodeURIComponent(redirectUrl)}`,
      "response_type=code",
    ].join("&");
    return ok({ url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` });
  }

  async exchangeGoogleCode(code: string, _redirectUrl: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    if (!this.googleCodes.has(code) || this.googleCodes.get(code) === true) {
      return err(createAppError("AUTH_LINK_INVALID"));
    }
    this.googleCodes.set(code, true);
    const user = this.ensureUser(GOOGLE_EMAIL);
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    this.issueSession(GOOGLE_EMAIL);
    return ok(this.identityFor(user));
  }

  async verifySessionToken(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const email = this.sessions.get(token);
    if (!email) return err(createAppError("AUTH_LINK_INVALID"));
    const user = this.users.get(email);
    if (!user) return err(createAppError("AUTH_LINK_INVALID"));
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    this.currentEmail = email;
    return ok(this.identityFor(user));
  }

  async revokeUserSessions(userId: UserIdValue): Promise<Result<void, AppError>> {
    for (const [token, email] of [...this.sessions]) {
      if (this.users.get(email)?.userId === userId) this.sessions.delete(token);
    }
    return ok(undefined);
  }

  latestMagicLinkToken(): string {
    return this.latestMagic;
  }

  latestGoogleCode(): string {
    return this.latestGoogle;
  }

  latestSessionToken(): string {
    return this.latestSession;
  }

  suspendCurrentUser(): void {
    if (!this.currentEmail) return;
    const user = this.users.get(this.currentEmail);
    if (user) user.suspended = true;
  }

  private ensureUser(email: string): StoredUser {
    const existing = this.users.get(email);
    if (existing) return existing;
    const local = email.split("@")[0] ?? "user";
    const created = UserId.create(`u-${email.replaceAll("@", "-").replaceAll(".", "-")}`);
    if (!created.ok) throw new Error(created.error.messageKey);
    const user: StoredUser = {
      userId: created.value,
      email,
      displayName: local.length > 0 ? local : "user",
      emailVerifiedAt: new Date(VERIFIED_AT_MS),
      suspended: false,
    };
    this.users.set(email, user);
    return user;
  }

  private issueSession(email: string): void {
    const token = this.next("session");
    this.sessions.set(token, email);
    this.latestSession = token;
    this.currentEmail = email;
  }

  private identityFor(user: StoredUser): AuthenticatedIdentity {
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      emailVerifiedAt: new Date(user.emailVerifiedAt.getTime()),
    };
  }

  private next(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence.toString(16).padStart(8, "0")}`;
  }
}
