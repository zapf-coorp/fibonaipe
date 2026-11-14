import { FakeAuthProvider, FakeClock, InMemoryPersistence, InMemoryRateLimiter } from "@fibonaipe/testing";
import type { StructuredLogger } from "@fibonaipe/application";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { createAppContainer, type AppContainer } from "../../src/server/composition.js";

const ORIGIN = "http://localhost:5173";

interface Payload {
  readonly status: number;
  readonly code?: string;
  readonly json: unknown;
  readonly response: Response;
}

type App = ReturnType<typeof createApp>;

function testApp(): { app: App; auth: FakeAuthProvider; container: AppContainer } {
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
  return { app: createApp(container), auth, container };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function send(
  app: App,
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
    json,
    response,
  };
}

/** The `name=value` pair of a Set-Cookie header, ready to send as a Cookie header. */
function cookiePair(response: Response, name: string): string {
  const listed = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const header = listed.find((value) => value.toLowerCase().includes(`${name}=`)) ?? response.headers.get("set-cookie") ?? "";
  return header.split(";")[0]?.trim() ?? "";
}

function field(json: unknown, key: string): string {
  if (!isRecord(json) || typeof json[key] !== "string") throw new Error(`missing ${key} in ${JSON.stringify(json)}`);
  return json[key];
}

async function signIn(app: App, auth: FakeAuthProvider, ip: string, email: string): Promise<{ cookie: string; userId: string }> {
  await send(app, "POST", "/api/auth/magic-link", { ip, body: { email } });
  const signed = await send(app, "POST", "/api/auth/callback", { ip, body: { token: auth.latestMagicLinkToken() } });
  expect(signed.status, signed.response.statusText).toBe(200);
  return { cookie: cookiePair(signed.response, "fib_account"), userId: field(signed.json, "userId") };
}

async function createGuestRoom(app: App, ip: string): Promise<{ code: string; hostCookie: string }> {
  const created = await send(app, "POST", "/api/rooms", { ip, body: { name: "Sprint", hostNickname: "Ada" } });
  expect([200, 201]).toContain(created.status);
  return { code: field(created.json, "code"), hostCookie: cookiePair(created.response, "fib_session") };
}

async function createTeam(app: App, ip: string, accountCookie: string): Promise<string> {
  const team = await send(app, "POST", "/api/teams", { ip, cookie: accountCookie, body: { name: "Bridge" } });
  expect(team.status).toBe(201);
  return field(team.json, "teamId");
}

describe("room claim and account link HTTP", () => {
  it("claims a guest room into a team the host belongs to", async () => {
    const { app, auth } = testApp();
    const owner = await signIn(app, auth, "203.0.113.10", "owner@example.com");
    const teamId = await createTeam(app, "203.0.113.10", owner.cookie);
    const room = await createGuestRoom(app, "203.0.113.11");

    const claimed = await send(app, "POST", `/api/rooms/${room.code}/claim`, {
      ip: "203.0.113.11",
      cookie: `${room.hostCookie}; ${owner.cookie}`,
      body: { teamId },
    });

    expect(claimed.status, claimed.response.statusText).toBe(200);
    expect(claimed.json).toMatchObject({ teamId });
  });

  it("refuses to claim a room into a team the account is not a member of", async () => {
    const { app, auth } = testApp();
    const owner = await signIn(app, auth, "203.0.113.20", "owner@example.com");
    const stranger = await signIn(app, auth, "203.0.113.21", "stranger@example.com");
    const ownersTeam = await createTeam(app, "203.0.113.20", owner.cookie);
    const room = await createGuestRoom(app, "203.0.113.22");

    const denied = await send(app, "POST", `/api/rooms/${room.code}/claim`, {
      ip: "203.0.113.22",
      cookie: `${room.hostCookie}; ${stranger.cookie}`,
      body: { teamId: ownersTeam },
    });

    expect(denied.status).toBe(403);
    expect(denied.code).toBe("FORBIDDEN");
  });

  it("refuses to claim without a signed-in account", async () => {
    const { app, auth } = testApp();
    const owner = await signIn(app, auth, "203.0.113.30", "owner@example.com");
    const teamId = await createTeam(app, "203.0.113.30", owner.cookie);
    const room = await createGuestRoom(app, "203.0.113.31");

    const denied = await send(app, "POST", `/api/rooms/${room.code}/claim`, {
      ip: "203.0.113.31",
      cookie: room.hostCookie,
      body: { teamId },
    });

    expect(denied.status).toBe(403);
  });

  it("binds the host's guest seat to the signed-in account", async () => {
    const { app, auth } = testApp();
    const owner = await signIn(app, auth, "203.0.113.40", "owner@example.com");
    const room = await createGuestRoom(app, "203.0.113.41");

    const linked = await send(app, "POST", `/api/rooms/${room.code}/link-account`, {
      ip: "203.0.113.41",
      cookie: `${room.hostCookie}; ${owner.cookie}`,
    });

    expect(linked.status, linked.response.statusText).toBe(200);
    expect(linked.json).toMatchObject({ userId: owner.userId });
  });

  it("refuses to link without an account cookie", async () => {
    const { app } = testApp();
    const room = await createGuestRoom(app, "203.0.113.50");

    const denied = await send(app, "POST", `/api/rooms/${room.code}/link-account`, {
      ip: "203.0.113.50",
      cookie: room.hostCookie,
    });

    expect(denied.status).toBe(403);
  });

  it("accepts a join from a signed-in account and returns its participant", async () => {
    const { app, auth } = testApp();
    const room = await createGuestRoom(app, "203.0.113.60");
    const member = await signIn(app, auth, "203.0.113.61", "member@example.com");

    const joined = await send(app, "POST", `/api/rooms/${room.code}/join`, {
      ip: "203.0.113.61",
      cookie: member.cookie,
      body: { nickname: "Bea", role: "dev", mode: "voter", clientOpId: "join-bea" },
    });

    expect(joined.status, joined.response.statusText).toBe(201);
    expect(field(joined.json, "participantId").length).toBeGreaterThan(0);
  });
});
