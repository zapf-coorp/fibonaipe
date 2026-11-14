import {
  UserId,
  createAppError,
  err,
  ok,
  type AppError,
  type Result,
  type UserId as UserIdValue,
} from "@fibonaipe/domain";
import type { AuthProvider, AuthenticatedIdentity, Clock, IdGenerator } from "@fibonaipe/application";

export type DevAuthMethod = "email" | "google";
export type DevUserRole = "teamAdmin" | "pm" | "dev" | "qa";

export interface DevAuthUser {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: DevUserRole;
}

export interface DevAuthSignInResult {
  readonly identity: AuthenticatedIdentity;
  readonly sessionToken: string;
  readonly method: DevAuthMethod;
}

export interface DevAuthProvider extends AuthProvider {
  readonly kind: "dev-fake";
  listUsers(): readonly DevAuthUser[];
  signInWithEmail(email: string): Promise<Result<DevAuthSignInResult, AppError>>;
  signInWithGoogle(email: string): Promise<Result<DevAuthSignInResult, AppError>>;
  latestMagicLinkToken(): string;
  latestSessionToken(): string;
}

export function isDevAuthProvider(value: AuthProvider): value is DevAuthProvider {
  return (value as Partial<DevAuthProvider>).kind === "dev-fake";
}

/** Seeded in this order so Host is always the first option in the dev login. */
export const DEV_AUTH_USERS: readonly DevAuthUser[] = [
  { userId: "dev-host", email: "host@fibonaipe.dev", displayName: "Host", role: "teamAdmin" },
  { userId: "dev-alice", email: "alice@fibonaipe.dev", displayName: "Alice", role: "pm" },
  { userId: "dev-bruno", email: "bruno@fibonaipe.dev", displayName: "Bruno", role: "dev" },
  { userId: "dev-carla", email: "carla@fibonaipe.dev", displayName: "Carla", role: "qa" },
];

export interface DevFakeAuthOptions {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly users?: readonly DevAuthUser[];
  readonly magicLinkTtlMinutes?: number;
}

interface StoredUser {
  readonly userId: UserIdValue;
  readonly email: string;
  readonly displayName: string;
  readonly role: DevUserRole;
  suspended: boolean;
}

interface MagicLink {
  readonly email: string;
  readonly expiresAt: Date;
  used: boolean;
}

interface GoogleCode {
  readonly email: string;
  used: boolean;
}

export class DevFakeAuthProvider implements DevAuthProvider {
  readonly kind = "dev-fake" as const;
  private readonly usersByEmail = new Map<string, StoredUser>();
  private readonly magicLinks = new Map<string, MagicLink>();
  private readonly googleCodes = new Map<string, GoogleCode>();
  private readonly sessions = new Map<string, string>();
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly magicLinkTtlMs: number;
  private latestMagic = "";
  private latestSession = "";

  constructor(options: DevFakeAuthOptions) {
    this.clock = options.clock;
    this.ids = options.ids;
    this.magicLinkTtlMs = (options.magicLinkTtlMinutes ?? 15) * 60_000;
    for (const seed of options.users ?? DEV_AUTH_USERS) {
      const email = normalizeEmail(seed.email);
      if (email === null) throw new Error(`Invalid dev auth email: ${seed.email}`);
      const userId = UserId.create(seed.userId);
      if (!userId.ok) throw new Error(`Invalid dev auth user id: ${seed.userId}`);
      this.usersByEmail.set(email, {
        userId: userId.value,
        email,
        displayName: seed.displayName,
        role: seed.role,
        suspended: false,
      });
    }
  }

  listUsers(): readonly DevAuthUser[] {
    return [...this.usersByEmail.values()].map((user) => ({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    }));
  }

  async sendMagicLink(email: string, _redirectUrl: string): Promise<Result<{ challengeId: string }, AppError>> {
    const normalized = normalizeEmail(email);
    if (normalized === null) return err(createAppError("VALIDATION"));
    const user = this.ensureUser(normalized);
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    this.createMagicToken(normalized);
    return ok({ challengeId: this.ids.newId() });
  }

  async verifyMagicLink(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const link = this.magicLinks.get(token);
    if (!link || link.used || link.expiresAt.getTime() < this.clock.now().getTime()) {
      return err(createAppError("AUTH_LINK_INVALID"));
    }
    link.used = true;
    const user = this.ensureUser(link.email);
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    const sessionToken = this.issueSession(link.email);
    return ok(this.identityFor(user, sessionToken));
  }

  getGoogleAuthUrl(state: string, redirectUrl: string): Result<{ url: string }, AppError> {
    const email = this.defaultGoogleEmail();
    const code = this.createGoogleCode(email);
    const query = new URLSearchParams({
      state,
      redirect_uri: redirectUrl,
      response_type: "code",
      code,
    }).toString();
    return ok({ url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` });
  }

  async exchangeGoogleCode(code: string, _redirectUrl: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const entry = this.googleCodes.get(code);
    if (!entry || entry.used) return err(createAppError("AUTH_LINK_INVALID"));
    entry.used = true;
    const user = this.ensureUser(entry.email);
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    const sessionToken = this.issueSession(entry.email);
    return ok(this.identityFor(user, sessionToken));
  }

  async verifySessionToken(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const email = this.sessions.get(token);
    if (email === undefined) return err(createAppError("AUTH_LINK_INVALID"));
    const user = this.usersByEmail.get(email);
    if (!user) return err(createAppError("AUTH_LINK_INVALID"));
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    return ok(this.identityFor(user, token));
  }

  async revokeUserSessions(userId: UserIdValue): Promise<Result<void, AppError>> {
    for (const [token, email] of [...this.sessions]) {
      if (this.usersByEmail.get(email)?.userId === userId) this.sessions.delete(token);
    }
    return ok(undefined);
  }

  async signInWithEmail(email: string): Promise<Result<DevAuthSignInResult, AppError>> {
    const normalized = normalizeEmail(email);
    if (normalized === null) return err(createAppError("VALIDATION"));
    const token = this.createMagicToken(normalized);
    const verified = await this.verifyMagicLink(token);
    if (!verified.ok) return verified;
    return ok({ identity: verified.value, sessionToken: this.latestSession, method: "email" });
  }

  async signInWithGoogle(email: string): Promise<Result<DevAuthSignInResult, AppError>> {
    const normalized = normalizeEmail(email);
    if (normalized === null) return err(createAppError("VALIDATION"));
    const code = this.createGoogleCode(normalized);
    const exchanged = await this.exchangeGoogleCode(code, "");
    if (!exchanged.ok) return exchanged;
    return ok({ identity: exchanged.value, sessionToken: this.latestSession, method: "google" });
  }

  latestMagicLinkToken(): string {
    return this.latestMagic;
  }

  latestSessionToken(): string {
    return this.latestSession;
  }

  private createMagicToken(email: string): string {
    const token = `dev-magic-${this.ids.newToken()}`;
    this.magicLinks.set(token, {
      email,
      expiresAt: new Date(this.clock.now().getTime() + this.magicLinkTtlMs),
      used: false,
    });
    this.latestMagic = token;
    return token;
  }

  private createGoogleCode(email: string): string {
    const code = `dev-google-${this.ids.newToken()}`;
    this.googleCodes.set(code, { email, used: false });
    return code;
  }

  private issueSession(email: string): string {
    const token = `dev-session-${this.ids.newToken()}`;
    this.sessions.set(token, email);
    this.latestSession = token;
    return token;
  }

  private ensureUser(email: string): StoredUser {
    const existing = this.usersByEmail.get(email);
    if (existing) return existing;
    const local = email.split("@")[0] ?? "user";
    const created = UserId.create(`dev-${slug(email)}`);
    if (!created.ok) throw new Error(created.error.messageKey);
    const user: StoredUser = {
      userId: created.value,
      email,
      displayName: local.length > 0 ? local : "User",
      role: "dev",
      suspended: false,
    };
    this.usersByEmail.set(email, user);
    return user;
  }

  private identityFor(user: StoredUser, sessionToken?: string): AuthenticatedIdentity {
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      emailVerifiedAt: new Date(this.clock.now().getTime()),
      ...(sessionToken === undefined ? {} : { sessionToken }),
    };
  }

  private defaultGoogleEmail(): string {
    const first = this.listUsers()[0];
    if (first) return first.email;
    return DEV_AUTH_USERS[0]?.email ?? "host@fibonaipe.dev";
  }
}

export function createDevFakeAuthProvider(options: DevFakeAuthOptions): DevAuthProvider {
  return new DevFakeAuthProvider(options);
}

function normalizeEmail(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  const at = normalized.indexOf("@");
  const domain = at > 0 ? normalized.slice(at + 1) : "";
  if (at <= 0 || normalized.indexOf("@", at + 1) !== -1 || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return null;
  }
  if (normalized.slice(0, at).length === 0 || /\s/.test(normalized)) return null;
  return normalized;
}

function slug(email: string): string {
  return email
    .replaceAll("@", "-")
    .replaceAll(".", "-")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
