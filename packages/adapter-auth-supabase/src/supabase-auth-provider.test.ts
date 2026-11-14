import { describe, expect, it } from "vitest";
import { SupabaseAuthProvider } from "./supabase-auth-provider.js";

const BASE = "https://proj.supabase.co";
const ANON = "anon-key";
const SERVICE = "service-key";
const REDIRECT = "https://app.example/login";

interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

type Handler = (url: string, init: RequestInit) => Response;

function fakeFetch(handler: Handler): { impl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return handler(call.url, call.init);
  }) as typeof fetch;
  return { impl, calls };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function providerWith(handler: Handler, serviceRoleKey?: string) {
  const { impl, calls } = fakeFetch(handler);
  const provider = new SupabaseAuthProvider({
    supabaseUrl: `${BASE}/`,
    anonKey: ANON,
    ...(serviceRoleKey === undefined ? {} : { serviceRoleKey }),
    fetchImpl: impl,
  });
  return { provider, calls };
}

const GOTRUE_USER = {
  id: "11111111-2222-3333-4444-555555555555",
  email: "ada@example.com",
  user_metadata: { full_name: "Ada Lovelace" },
};

describe("SupabaseAuthProvider", () => {
  it("trims the trailing slash from the Supabase URL", async () => {
    const { provider, calls } = providerWith(() => json({ ok: true }));
    await provider.sendMagicLink("ada@example.com", REDIRECT);
    expect(calls[0]?.url).toBe(`${BASE}/auth/v1/otp`);
  });

  it("rejects a malformed email with VALIDATION without calling the network", async () => {
    const { provider, calls } = providerWith(() => json({}));
    const result = await provider.sendMagicLink("not-an-email", REDIRECT);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected VALIDATION");
    expect(result.error.code).toBe("VALIDATION");
    expect(calls).toHaveLength(0);
  });

  it("posts a magic link request with the anon key and returns the normalized email as challenge", async () => {
    const { provider, calls } = providerWith(() => json({}));
    const result = await provider.sendMagicLink(" Ada@Example.com ", REDIRECT);
    expect(result).toEqual({ ok: true, value: { challengeId: "ada@example.com" } });
    const call = calls[0];
    expect(call?.init.method).toBe("POST");
    expect((call?.init.headers as Record<string, string>).apikey).toBe(ANON);
    expect(JSON.parse(String(call?.init.body))).toEqual({
      email: "ada@example.com",
      create_user: true,
      options: { emailRedirectTo: REDIRECT },
    });
  });

  it("maps a failed magic link request to AUTH_LINK_INVALID", async () => {
    const { provider } = providerWith(() => json({ msg: "rate limited" }, 429));
    const result = await provider.sendMagicLink("ada@example.com", REDIRECT);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected AUTH_LINK_INVALID");
    expect(result.error.code).toBe("AUTH_LINK_INVALID");
  });

  it("builds the Google authorize URL with state and redirect", () => {
    const { provider } = providerWith(() => json({}));
    const result = provider.getGoogleAuthUrl("state-1", REDIRECT);
    if (!result.ok) throw new Error(result.error.code);
    const url = new URL(result.value.url);
    expect(url.origin + url.pathname).toBe(`${BASE}/auth/v1/authorize`);
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_to")).toBe(REDIRECT);
  });

  it("verifies a token_hash via /verify and keeps the access token as sessionToken", async () => {
    const { provider, calls } = providerWith((url) => {
      if (url.endsWith("/auth/v1/verify")) return json({ access_token: "at-1", user: GOTRUE_USER });
      return json({}, 500);
    });
    const result = await provider.verifyMagicLink("otp:ada@example.com:hash-123");
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.email).toBe("ada@example.com");
    expect(result.value.displayName).toBe("Ada Lovelace");
    expect(result.value.sessionToken).toBe("at-1");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ type: "magiclink", token_hash: "hash-123" });
  });

  it("falls back to treating the token as an access token when /verify fails", async () => {
    const { provider } = providerWith((url) => {
      if (url.endsWith("/auth/v1/verify")) return json({ msg: "invalid" }, 400);
      if (url.endsWith("/auth/v1/user")) return json(GOTRUE_USER);
      return json({}, 500);
    });
    const result = await provider.verifyMagicLink("bearer-token");
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.sessionToken).toBe("bearer-token");
  });

  it("returns AUTH_LINK_INVALID when neither /verify nor /user accept the token", async () => {
    const { provider } = providerWith(() => json({ msg: "nope" }, 401));
    const result = await provider.verifyMagicLink("garbage");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected AUTH_LINK_INVALID");
    expect(result.error.code).toBe("AUTH_LINK_INVALID");
  });

  it("exchanges a PKCE auth code for a session", async () => {
    const { provider, calls } = providerWith((url) => {
      if (url.includes("grant_type=pkce")) return json({ access_token: "at-pkce", user: GOTRUE_USER });
      return json({}, 500);
    });
    const result = await provider.exchangeGoogleCode("code-9", REDIRECT);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.sessionToken).toBe("at-pkce");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ auth_code: "code-9" });
  });

  it("verifies a session token against /user and maps the identity", async () => {
    const { provider, calls } = providerWith(() => json(GOTRUE_USER));
    const result = await provider.verifySessionToken("at-7");
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.userId).toBe(GOTRUE_USER.id);
    expect(result.value.sessionToken).toBe("at-7");
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe("Bearer at-7");
  });

  it("maps a non-200 /user response to AUTH_LINK_INVALID", async () => {
    const { provider } = providerWith(() => json({ msg: "bad jwt" }, 401));
    const result = await provider.verifySessionToken("expired");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected AUTH_LINK_INVALID");
    expect(result.error.code).toBe("AUTH_LINK_INVALID");
  });

  it("returns ACCOUNT_SUSPENDED when banned_until is in the future", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const { provider } = providerWith(() => json({ ...GOTRUE_USER, banned_until: future }));
    const result = await provider.verifySessionToken("at-banned");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ACCOUNT_SUSPENDED");
    expect(result.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("treats a network failure as AUTH_LINK_INVALID instead of throwing", async () => {
    const impl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const provider = new SupabaseAuthProvider({ supabaseUrl: BASE, anonKey: ANON, fetchImpl: impl });
    const result = await provider.verifySessionToken("at-1");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected AUTH_LINK_INVALID");
    expect(result.error.code).toBe("AUTH_LINK_INVALID");
  });

  it("calls the admin logout endpoint with the service role key when configured", async () => {
    const { provider, calls } = providerWith(() => json({}), SERVICE);
    const result = await provider.revokeUserSessions("user-42" as never);
    expect(result.ok).toBe(true);
    expect(calls[0]?.url).toBe(`${BASE}/auth/v1/admin/users/user-42/logout`);
    expect((calls[0]?.init.headers as Record<string, string>).apikey).toBe(SERVICE);
  });

  it("does not call the network to revoke sessions without a service role key", async () => {
    const { provider, calls } = providerWith(() => json({}));
    const result = await provider.revokeUserSessions("user-42" as never);
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(0);
  });
});
