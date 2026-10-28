import type { StructuredLogger } from "@fibonaipe/application";
import { FakeAuthProvider, FakeClock, InMemoryPersistence, InMemoryRateLimiter } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { createAppContainer, type AppContainer } from "../../src/server/composition.js";

const ORIGIN = "http://localhost:5173";
const REDIRECT = "https://app.example/callback";

interface Payload {
  readonly status: number;
  readonly code?: string;
  readonly text: string;
  readonly json: unknown;
  readonly response: Response;
}

function testApp(): {
  app: ReturnType<typeof createApp>;
  auth: FakeAuthProvider;
} {
  const clock = new FakeClock("2026-10-27T15:00:00.000Z");
  const auth = new FakeAuthProvider();
  const silent: StructuredLogger = { info() {}, warn() {}, error() {} };
  const base = createAppContainer({
    NODE_ENV: "test",
    PUBLIC_APP_URL: ORIGIN,
    CRON_SECRET: "test-cron-secret",
    PERSISTENCE_DRIVER: "in-memory",
    REALTIME_DRIVER: "fake",
  });
  const container: AppContainer = {
    ...base,
    clock,
    persistence: new InMemoryPersistence(),
    authProvider: auth,
    rateLimiter: new InMemoryRateLimiter(clock),
    logger: silent,
  };
  return { app: createApp(container), auth };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function send(
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  input: { readonly ip: string; readonly cookie?: string; readonly body?: unknown },
): Promise<Payload> {
  const headers = new Headers();
  headers.set("origin", ORIGIN);
  headers.set("content-type", "application/json");
  headers.set("x-forwarded-for", input.ip);
  if (input.cookie) headers.set("cookie", input.cookie);
  const response = await app.request(path, {
    method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = undefined;
  }
  const error = isRecord(json) && isRecord(json.error) ? json.error : undefined;
  return {
    status: response.status,
    code: error && typeof error.code === "string" ? error.code : undefined,
    text,
    json,
    response,
  };
}

function sessionCookie(response: Response): string {
  const listed = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const header = listed.find((value) => value.toLowerCase().includes("fib_session=")) ?? response.headers.get("set-cookie") ?? "";
  return header;
}

function errorBody(payload: Payload): Record<string, unknown> | undefined {
  return isRecord(payload.json) && isRecord(payload.json.error) ? payload.json.error : undefined;
}

async function guestCookie(app: ReturnType<typeof createApp>): Promise<string> {
  const created = await send(app, "POST", "/api/rooms", {
    ip: "203.0.113.50",
    body: { name: "Sprint", hostNickname: "Ada" },
  });
  expect([200, 201], created.text).toContain(created.status);
  const header = sessionCookie(created.response);
  expect(header.toLowerCase()).toContain("fib_session=");
  const pair = header.split(";")[0]?.trim() ?? "";
  return pair;
}

describe("auth teams HTTP", () => {
  it("returns identical status and body for an unknown email and a known email", async () => {
    const { app, auth } = testApp();
    await auth.sendMagicLink("ada@example.com", REDIRECT);
    await auth.verifyMagicLink(auth.latestMagicLinkToken());
    const guest = await guestCookie(app);

    const unknown = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.10",
      body: { email: "nobody@example.com" },
    });
    const known = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.11",
      body: { email: "ada@example.com" },
    });
    const asGuest = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.12",
      cookie: guest,
      body: { email: "nobody@example.com" },
    });

    expect(unknown.status).toBeLessThan(400);
    expect(known.status).toBe(unknown.status);
    expect(known.text).toBe(unknown.text);
    expect(asGuest.status).toBe(unknown.status);
    expect(asGuest.text).toBe(unknown.text);
    expect(unknown.text.toLowerCase()).not.toContain("nobody@example.com");
    expect(known.text.toLowerCase()).not.toContain("ada@example.com");
    expect(unknown.text.toLowerCase()).not.toMatch(/exists|not found|unknown/);
  });

  it("sets a fib_session cookie on the first completion and returns AUTH_LINK_INVALID when the link is reused", async () => {
    const { app, auth } = testApp();
    const sent = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.20",
      body: { email: "ada@example.com" },
    });
    expect(sent.status, sent.text).toBeLessThan(400);
    const token = auth.latestMagicLinkToken();
    expect(token.length).toBeGreaterThan(0);

    const first = await send(app, "POST", "/api/auth/callback", {
      ip: "203.0.113.20",
      body: { token },
    });
    expect(first.status, first.text).toBeLessThan(400);
    expect(sessionCookie(first.response).toLowerCase()).toContain("fib_session=");
    expect(first.text).not.toContain(token);

    const second = await send(app, "POST", "/api/auth/callback", {
      ip: "203.0.113.21",
      body: { token },
    });
    expect(second.status, second.text).toBe(401);
    expect(second.code).toBe("AUTH_LINK_INVALID");
    expect(errorBody(second)?.messageKey).toBe("errors.AUTH_LINK_INVALID");
  });

  it("returns ACCOUNT_SUSPENDED and no fib_session when a suspended user completes sign-in", async () => {
    const { app, auth } = testApp();
    await auth.sendMagicLink("suspended@example.com", REDIRECT);
    await auth.verifyMagicLink(auth.latestMagicLinkToken());
    auth.suspendCurrentUser();
    await auth.sendMagicLink("suspended@example.com", REDIRECT);
    const completed = await send(app, "POST", "/api/auth/callback", {
      ip: "203.0.113.30",
      body: { token: auth.latestMagicLinkToken() },
    });
    expect(completed.status, completed.text).toBe(403);
    expect(completed.code).toBe("ACCOUNT_SUSPENDED");
    expect(errorBody(completed)?.messageKey).toBe("errors.ACCOUNT_SUSPENDED");
    expect(sessionCookie(completed.response).toLowerCase()).not.toContain("fib_session=");
  });

  it("returns 403 for anonymous, guest, and a signed-in non-admin on GET /api/admin/users", async () => {
    const { app, auth } = testApp();
    const anonymous = await send(app, "GET", "/api/admin/users", { ip: "203.0.113.40" });
    expect(anonymous.status, anonymous.text).toBe(403);
    expect(anonymous.code).toBe("FORBIDDEN");
    expect(errorBody(anonymous)?.messageKey).toBe("errors.FORBIDDEN");

    const guest = await send(app, "GET", "/api/admin/users", {
      ip: "203.0.113.41",
      cookie: await guestCookie(app),
    });
    expect(guest.status, guest.text).toBe(403);
    expect(guest.code).toBe("FORBIDDEN");

    const sent = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.42",
      body: { email: "ada@example.com" },
    });
    expect(sent.status, sent.text).toBeLessThan(400);
    const signed = await send(app, "POST", "/api/auth/callback", {
      ip: "203.0.113.42",
      body: { token: auth.latestMagicLinkToken() },
    });
    expect(signed.status, signed.text).toBeLessThan(400);
    const header = sessionCookie(signed.response);
    expect(header.toLowerCase()).toContain("fib_session=");
    const member = await send(app, "GET", "/api/admin/users", {
      ip: "203.0.113.42",
      cookie: header.split(";")[0]?.trim(),
    });
    expect(member.status, member.text).toBe(403);
    expect(member.code).toBe("FORBIDDEN");
    expect(member.text.toLowerCase()).not.toContain("ada@example.com");
  });

  it("returns 404 with an error body and no team payload when another team, a guest, or an anonymous caller uses the id", async () => {
    const { app, auth } = testApp();
    const ownerSent = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.60",
      body: { email: "owner@example.com" },
    });
    expect(ownerSent.status, ownerSent.text).toBeLessThan(400);
    const ownerDone = await send(app, "POST", "/api/auth/callback", {
      ip: "203.0.113.60",
      body: { token: auth.latestMagicLinkToken() },
    });
    expect(ownerDone.status, ownerDone.text).toBeLessThan(400);
    const ownerCookie = sessionCookie(ownerDone.response).split(";")[0]?.trim() ?? "";
    expect(ownerCookie.toLowerCase()).toContain("fib_session=");

    const created = await send(app, "POST", "/api/teams", {
      ip: "203.0.113.60",
      cookie: ownerCookie,
      body: { name: "SecretBridge" },
    });
    expect([200, 201], created.text).toContain(created.status);
    const teamId = teamIdOf(created.json);
    expect(teamId.length).toBeGreaterThan(0);

    const ownerView = await send(app, "GET", `/api/teams/${teamId}`, {
      ip: "203.0.113.60",
      cookie: ownerCookie,
    });
    expect(ownerView.status, ownerView.text).toBe(200);
    expect(ownerView.text).toContain("SecretBridge");

    const otherSent = await send(app, "POST", "/api/auth/magic-link", {
      ip: "203.0.113.61",
      body: { email: "other@example.com" },
    });
    expect(otherSent.status, otherSent.text).toBeLessThan(400);
    const otherDone = await send(app, "POST", "/api/auth/callback", {
      ip: "203.0.113.61",
      body: { token: auth.latestMagicLinkToken() },
    });
    expect(otherDone.status, otherDone.text).toBeLessThan(400);
    const otherCookie = sessionCookie(otherDone.response).split(";")[0]?.trim() ?? "";
    const otherTeam = await send(app, "POST", "/api/teams", {
      ip: "203.0.113.61",
      cookie: otherCookie,
      body: { name: "OtherTeam" },
    });
    expect([200, 201], otherTeam.text).toContain(otherTeam.status);

    const idor = await send(app, "GET", `/api/teams/${teamId}`, {
      ip: "203.0.113.61",
      cookie: otherCookie,
    });
    const missing = await send(app, "GET", "/api/teams/team-does-not-exist", {
      ip: "203.0.113.61",
      cookie: otherCookie,
    });
    expect(idor.status, idor.text).toBe(404);
    expect(idor.code).toBe("NOT_FOUND");
    expect(idor.json).toEqual(missing.json);
    expect(errorBody(idor)).toEqual({
      code: "NOT_FOUND",
      messageKey: "errors.NOT_FOUND",
      params: expect.any(Object),
    });
    expect(Object.keys(isRecord(idor.json) ? idor.json : {})).toEqual(["error"]);
    expect(idor.text).not.toContain("SecretBridge");

    const anonymous = await send(app, "GET", `/api/teams/${teamId}`, { ip: "203.0.113.62" });
    const guest = await send(app, "GET", `/api/teams/${teamId}`, {
      ip: "203.0.113.63",
      cookie: await guestCookie(app),
    });
    expect(anonymous.status, anonymous.text).toBe(404);
    expect(anonymous.code).toBe("NOT_FOUND");
    expect(anonymous.text).not.toContain("SecretBridge");
    expect(guest.status, guest.text).toBe(404);
    expect(guest.code).toBe("NOT_FOUND");
    expect(guest.text).not.toContain("SecretBridge");
    expect(anonymous.json).toEqual(idor.json);
    expect(guest.json).toEqual(idor.json);
  });
});

function teamIdOf(json: unknown): string {
  if (!isRecord(json)) return "";
  if (typeof json.teamId === "string") return json.teamId;
  if (typeof json.id === "string") return json.id;
  if (isRecord(json.team) && typeof json.team.id === "string") return json.team.id;
  return "";
}
