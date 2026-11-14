import { UserId, createAppError, err, ok, type AppError, type Result, type UserId as UserIdValue } from "@fibonaipe/domain";
import type { AuthProvider, AuthenticatedIdentity } from "@fibonaipe/application";

export interface SupabaseAuthOptions {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey?: string;
  readonly fetchImpl?: typeof fetch;
}

/** Subset of the GoTrue user payload that this adapter reads. */
interface GoTrueUser {
  readonly id?: unknown;
  readonly email?: unknown;
  readonly user_metadata?: { readonly full_name?: unknown; readonly name?: unknown };
  readonly banned_until?: unknown;
}

/** Subset of the GoTrue session payload (`/verify`, `/token`). */
interface GoTrueSession {
  readonly access_token?: unknown;
  readonly user?: GoTrueUser;
}

export class SupabaseAuthProvider implements AuthProvider {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: SupabaseAuthOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  }

  async sendMagicLink(email: string, redirectUrl: string): Promise<Result<{ challengeId: string }, AppError>> {
    const normalized = normalizeEmail(email);
    if (normalized === null) return err(createAppError("VALIDATION"));
    const response = await this.send("POST", "/auth/v1/otp", this.anonHeaders(), {
      email: normalized,
      create_user: true,
      options: { emailRedirectTo: redirectUrl },
    });
    if (!response?.ok) return err(createAppError("AUTH_LINK_INVALID"));
    return ok({ challengeId: normalized });
  }

  async verifyMagicLink(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    // Accepts `otp:<email>:<token_hash>` (as built by the redirect) or a bare token_hash.
    const tokenHash = token.startsWith("otp:") ? token.slice(token.lastIndexOf(":") + 1) : token;
    const response = await this.send("POST", "/auth/v1/verify", this.anonHeaders(), {
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (response?.ok) {
      const session = await readJson<GoTrueSession>(response);
      if (session?.user && typeof session.access_token === "string") {
        return identityFrom(session.user, session.access_token);
      }
    }
    // Fallback: the value may already be a bearer access_token.
    return this.verifySessionToken(token);
  }

  getGoogleAuthUrl(state: string, redirectUrl: string): Result<{ url: string }, AppError> {
    const url =
      `${this.baseUrl}/auth/v1/authorize?provider=google` +
      `&redirect_to=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`;
    return ok({ url });
  }

  async exchangeGoogleCode(code: string, _redirectUrl: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const response = await this.send("POST", "/auth/v1/token?grant_type=pkce", this.anonHeaders(), { auth_code: code });
    if (response?.ok) {
      const session = await readJson<GoTrueSession>(response);
      if (session?.user && typeof session.access_token === "string") {
        return identityFrom(session.user, session.access_token);
      }
    }
    // Fallback: the code may already be a bearer access_token (implicit redirect).
    return this.verifySessionToken(code);
  }

  async verifySessionToken(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const response = await this.send("GET", "/auth/v1/user", {
      apikey: this.options.anonKey,
      Authorization: `Bearer ${token}`,
    });
    if (!response || response.status !== 200) return err(createAppError("AUTH_LINK_INVALID"));
    const user = await readJson<GoTrueUser>(response);
    if (!user) return err(createAppError("AUTH_LINK_INVALID"));
    return identityFrom(user, token);
  }

  async revokeUserSessions(userId: UserIdValue): Promise<Result<void, AppError>> {
    const serviceRoleKey = this.options.serviceRoleKey;
    if (serviceRoleKey) {
      await this.send(
        "POST",
        `/auth/v1/admin/users/${encodeURIComponent(userId)}/logout`,
        { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        {},
      );
    }
    return ok(undefined);
  }

  private anonHeaders(): Record<string, string> {
    return { apikey: this.options.anonKey };
  }

  /** Network failures resolve to `undefined` so callers map them to a domain error. */
  private async send(
    method: "GET" | "POST",
    path: string,
    headers: Record<string, string>,
    body?: unknown,
  ): Promise<Response | undefined> {
    const init: RequestInit = { method, headers: { ...headers } };
    if (body !== undefined) {
      init.headers = { ...init.headers, "content-type": "application/json" };
      init.body = JSON.stringify(body);
    }
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch {
      return undefined;
    }
  }
}

export function createSupabaseAuthProvider(options: SupabaseAuthOptions): SupabaseAuthProvider {
  return new SupabaseAuthProvider(options);
}

function identityFrom(user: GoTrueUser, sessionToken: string): Result<AuthenticatedIdentity, AppError> {
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const rawId = typeof user.id === "string" ? user.id : "";
  const userId = UserId.create(rawId);
  if (!userId.ok || email.length === 0) return err(createAppError("AUTH_LINK_INVALID"));
  if (typeof user.banned_until === "string" && Date.parse(user.banned_until) > Date.now()) {
    return err(createAppError("ACCOUNT_SUSPENDED"));
  }
  const meta = user.user_metadata;
  const name = [meta?.full_name, meta?.name].find((value): value is string => typeof value === "string" && value.length > 0);
  return ok({
    userId: userId.value,
    email,
    displayName: name ?? email.split("@")[0] ?? "User",
    emailVerifiedAt: new Date(0),
    sessionToken,
  });
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function normalizeEmail(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  const at = normalized.indexOf("@");
  const domain = at > 0 ? normalized.slice(at + 1) : "";
  if (at <= 0 || normalized.indexOf("@", at + 1) !== -1 || /\s/.test(normalized)) return null;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  return normalized;
}
