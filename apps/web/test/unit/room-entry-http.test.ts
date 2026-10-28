import { createHash } from "node:crypto";
import {
  ANON_ROOM_TTL_MINUTES,
  MAX_ITEMS_PER_ROOM,
  MAX_NICKNAME_LENGTH,
  MAX_PARTICIPANTS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  RoomCode,
  RoomId,
  ok,
} from "@fibonaipe/domain";
import type { Persistence, RateLimiter } from "@fibonaipe/application";
import { createSqlitePersistence } from "@fibonaipe/adapter-persistence-sqlite";
import { FakeClock, FakeRealtime, InMemoryPersistence, InMemoryRateLimiter } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { createAppContainer, type AppContainer } from "../../src/server/composition.js";

const ORIGIN = "http://localhost:5173";
const CRON_SECRET = "test-cron-secret";
const SECRET_COMMENT = "secret-ada-vote";

interface ErrorPayload {
  readonly status: number;
  readonly code?: string;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly text: string;
  readonly json: unknown;
}

interface SessionCookie {
  readonly token: string;
  readonly header: string;
}

interface CreatedRoom {
  readonly code: string;
  readonly token: string;
  readonly cookie: string;
}

function testApp(options?: {
  readonly persistence?: Persistence;
  readonly clock?: FakeClock;
  readonly rateLimiter?: RateLimiter;
  readonly realtime?: FakeRealtime;
}): { app: ReturnType<typeof createApp>; container: AppContainer; clock: FakeClock; persistence: Persistence; realtime: FakeRealtime } {
  const clock = options?.clock ?? new FakeClock("2026-10-27T15:00:00.000Z");
  const persistence = options?.persistence ?? new InMemoryPersistence();
  const realtime = options?.realtime ?? new FakeRealtime();
  const base = createAppContainer({
    NODE_ENV: "test",
    PUBLIC_APP_URL: ORIGIN,
    CRON_SECRET,
    PERSISTENCE_DRIVER: "in-memory",
    REALTIME_DRIVER: "fake",
  });
  const container: AppContainer = {
    ...base,
    clock,
    persistence,
    realtime,
    rateLimiter: options?.rateLimiter ?? new InMemoryRateLimiter(clock),
  };
  return { app: createApp(container), container, clock, persistence, realtime };
}

function requestHeaders(input: { readonly ip: string; readonly cookie?: string; readonly origin?: string }): Headers {
  const headers = new Headers();
  headers.set("origin", input.origin ?? ORIGIN);
  headers.set("content-type", "application/json");
  headers.set("x-forwarded-for", input.ip);
  if (input.cookie) headers.set("cookie", input.cookie);
  return headers;
}

async function readPayload(response: Response): Promise<ErrorPayload> {
  const text = await response.text();
  let json: unknown = undefined;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = undefined;
  }
  const error = isRecord(json) && isRecord(json.error) ? json.error : undefined;
  const params = error && isRecord(error.params) ? error.params : undefined;
  return {
    status: response.status,
    code: error && typeof error.code === "string" ? error.code : undefined,
    params,
    text,
    json,
  };
}

async function send(
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  input: { readonly ip: string; readonly cookie?: string; readonly origin?: string; readonly body?: unknown | string },
): Promise<ErrorPayload & { readonly response: Response }> {
  const body = input.body === undefined ? undefined : typeof input.body === "string" ? input.body : JSON.stringify(input.body);
  const response = await app.request(path, {
    method,
    headers: requestHeaders(input),
    body,
  });
  return { response, ...(await readPayload(response)) };
}

function sessionFrom(response: Response): SessionCookie {
  const listed = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const header = listed.find((value) => value.toLowerCase().includes("fib_session=")) ?? response.headers.get("set-cookie") ?? "";
  const pair = header.split(";")[0]?.trim() ?? "";
  const token = decodeURIComponent(pair.slice(pair.indexOf("=") + 1)).replaceAll('"', "");
  return { token, header };
}

function expectGuestCookie(header: string, nowMs: number): void {
  const attrs = new Map<string, string>();
  for (const part of header.split(";").slice(1)) {
    const [rawName, ...rest] = part.trim().split("=");
    const name = rawName?.toLowerCase() ?? "";
    if (name.length === 0) continue;
    attrs.set(name, rest.join("=") || "true");
  }
  expect(attrs.has("httponly"), header).toBe(true);
  expect(attrs.has("secure"), header).toBe(true);
  expect(attrs.get("samesite")?.toLowerCase(), header).toBe("lax");
  expect(attrs.get("path"), header).toBe("/");
  const maxAge = attrs.get("max-age");
  if (maxAge !== undefined) {
    expect(Number(maxAge), header).toBe(ANON_ROOM_TTL_MINUTES * 60);
    return;
  }
  const expires = Date.parse(attrs.get("expires") ?? "");
  expect(Math.abs(expires - nowMs - ANON_ROOM_TTL_MINUTES * 60_000), header).toBeLessThan(5_000);
}

async function roomDocument(persistence: Persistence, code: string): Promise<string> {
  const parsed = RoomCode.create(code);
  if (!parsed.ok) throw new Error(parsed.error.code);
  const loaded = await persistence.transaction({}, async (repos) => ok(await repos.rooms.findByCode(parsed.value)));
  if (!loaded.ok || loaded.value === null) throw new Error(`room ${code} was not stored`);
  return JSON.stringify(loaded.value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function op(index: number): string {
  return `01ARZ3NDEKTSV4RRFFQ69G5F${String(index).padStart(2, "0")}`;
}

function guessCode(index: number): string {
  const char = ROOM_CODE_ALPHABET[index % ROOM_CODE_ALPHABET.length] ?? "2";
  return `2345678${char}`;
}

async function createRoom(app: ReturnType<typeof createApp>, ip: string, name = "Sprint"): Promise<CreatedRoom> {
  const payload = await send(app, "POST", "/api/rooms", {
    ip,
    body: { name, hostNickname: "Ada" },
  });
  expect([200, 201], payload.text).toContain(payload.status);
  const code = isRecord(payload.json) && typeof payload.json.code === "string" ? payload.json.code : "";
  expect(code).toMatch(new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`));
  const session = sessionFrom(payload.response);
  expect(session.token.length, payload.text).toBeGreaterThan(0);
  expect(JSON.stringify(payload.json)).not.toContain(session.token);
  return { code, token: session.token, cookie: `fib_session=${session.token}` };
}

describe("room entry HTTP", () => {
  it("returns 400 VALIDATION for invalid JSON and for a room name outside 1–80", async () => {
    const { app } = testApp();
    const invalid = await send(app, "POST", "/api/rooms", { ip: "203.0.113.10", body: "{" });
    expect(invalid.status, invalid.text).toBe(400);
    expect(invalid.code, invalid.text).toBe("VALIDATION");

    const empty = await send(app, "POST", "/api/rooms", { ip: "203.0.113.10", body: { name: "", hostNickname: "Ada" } });
    expect(empty.status, empty.text).toBe(400);
    expect(empty.code).toBe("VALIDATION");

    const tooLong = await send(app, "POST", "/api/rooms", {
      ip: "203.0.113.10",
      body: { name: "n".repeat(81), hostNickname: "Ada" },
    });
    expect(tooLong.status, tooLong.text).toBe(400);
    expect(tooLong.code).toBe("VALIDATION");

    const nickname = await send(app, "POST", "/api/rooms/23456789/join", {
      ip: "203.0.113.11",
      body: {
        nickname: "n".repeat(MAX_NICKNAME_LENGTH + 1),
        role: "dev",
        mode: "voter",
        clientOpId: op(1),
      },
    });
    expect(nickname.status, nickname.text).toBe(400);
    expect(nickname.code).toBe("VALIDATION");
  });

  it("returns 403 for a foreign Origin and does not call a use case", async () => {
    let transactions = 0;
    let hits = 0;
    const inner = new InMemoryPersistence();
    const clock = new FakeClock("2026-10-27T15:00:00.000Z");
    const limiter = new InMemoryRateLimiter(clock);
    const persistence: Persistence = {
      ping: () => inner.ping(),
      transaction: (options, work) => {
        transactions += 1;
        return inner.transaction(options, work);
      },
    };
    const rateLimiter: RateLimiter = {
      hit: (key, rule) => {
        hits += 1;
        return limiter.hit(key, rule);
      },
      reset: (key, ruleId) => limiter.reset(key, ruleId),
    };
    const { app } = testApp({ persistence, clock, rateLimiter });
    const denied = await send(app, "POST", "/api/rooms", {
      ip: "203.0.113.12",
      origin: "https://evil.example",
      body: { name: "Sprint", hostNickname: "Ada" },
    });
    expect(denied.status, denied.text).toBe(403);
    expect(denied.code, denied.text).toBe("FORBIDDEN");
    expect(transactions).toBe(0);
    expect(hits).toBe(0);
  });

  it("hides a missing room as 404 NOT_FOUND and forbids a joined observer with 403", async () => {
    const { app } = testApp();
    const missing = await send(app, "POST", "/api/rooms/23456789/join", {
      ip: "203.0.113.13",
      body: { nickname: "Bea", role: "qa", mode: "voter", clientOpId: op(2) },
    });
    expect(missing.status, missing.text).toBe(404);
    expect(missing.code, missing.text).toBe("NOT_FOUND");
    expect(missing.text).not.toContain("FORBIDDEN");

    const created = await createRoom(app, "203.0.113.14");
    const joined = await send(app, "POST", `/api/rooms/${created.code}/join`, {
      ip: "203.0.113.15",
      body: { nickname: "Omar", role: "observer", mode: "observer", clientOpId: op(3) },
    });
    expect([200, 201], joined.text).toContain(joined.status);
    const observer = sessionFrom(joined.response);
    const reveal = await send(app, "POST", `/api/rooms/${created.code}/reveal`, {
      ip: "203.0.113.15",
      cookie: `fib_session=${observer.token}`,
      body: { clientOpId: op(4) },
    });
    expect(reveal.status, reveal.text).toBe(403);
    expect(reveal.code, reveal.text).toBe("FORBIDDEN");
  });

  it("returns 429 retryAfterSec on the 21st code guess from one IP in a minute", async () => {
    const { app } = testApp();
    const ip = "203.0.113.21";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const guess = await send(app, "POST", `/api/rooms/${guessCode(attempt)}/join`, {
        ip,
        body: { nickname: "Bea", role: "dev", mode: "voter", clientOpId: op(attempt) },
      });
      expect(guess.status, guess.text).not.toBe(429);
    }
    const limited = await send(app, "POST", `/api/rooms/${guessCode(20)}/join`, {
      ip,
      body: { nickname: "Bea", role: "dev", mode: "voter", clientOpId: op(20) },
    });
    expect(limited.status, limited.text).toBe(429);
    expect(limited.code).toBe("RATE_LIMITED");
    expect(typeof limited.params?.retryAfterSec).toBe("number");
    expect(Number(limited.params?.retryAfterSec)).toBeGreaterThan(0);
  });

  it("sets a guest cookie on create and join and stores only the SHA-256", async () => {
    const { app, persistence, clock } = testApp();
    const created = await send(app, "POST", "/api/rooms", {
      ip: "203.0.113.30",
      body: { name: "Sprint", hostNickname: "Ada" },
    });
    expect([200, 201], created.text).toContain(created.status);
    const host = sessionFrom(created.response);
    expect(host.header.toLowerCase()).toContain("fib_session=");
    expectGuestCookie(host.header, clock.now().getTime());
    const code = isRecord(created.json) && typeof created.json.code === "string" ? created.json.code : "";
    expect(code).toMatch(new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`));
    expect(created.text).not.toContain(host.token);

    const joined = await send(app, "POST", `/api/rooms/${code}/join`, {
      ip: "203.0.113.31",
      body: { nickname: "Bea", role: "qa", mode: "voter", clientOpId: op(31) },
    });
    expect([200, 201], joined.text).toContain(joined.status);
    const guest = sessionFrom(joined.response);
    expectGuestCookie(guest.header, clock.now().getTime());
    expect(joined.text).not.toContain(guest.token);
    expect(guest.token).not.toBe(host.token);

    const stored = await roomDocument(persistence, code);
    expect(stored).not.toContain(host.token);
    expect(stored).not.toContain(guest.token);
    expect(stored).toContain(sha256(host.token));
    expect(stored).toContain(sha256(guest.token));
  });

  it("lists both participants and omits the other voter's card, suit, and comment before reveal", async () => {
    const events: unknown[] = [];
    const realtime = new FakeRealtime();
    const publish = realtime.publish.bind(realtime);
    realtime.publish = async (roomId, event) => {
      events.push(event);
      return publish(roomId, event);
    };
    const { app } = testApp({ realtime });
    const host = await createRoom(app, "203.0.113.40");
    const added = await send(app, "POST", `/api/rooms/${host.code}/items`, {
      ip: "203.0.113.40",
      cookie: host.cookie,
      body: { title: "Bridge work", clientOpId: op(41) },
    });
    expect([200, 201], added.text).toContain(added.status);
    const snapshot = await send(app, "GET", `/api/rooms/${host.code}/state?since=0`, {
      ip: "203.0.113.40",
      cookie: host.cookie,
    });
    expect(snapshot.status, snapshot.text).toBe(200);
    const itemId = firstItemId(snapshot.json);
    expect(itemId.length).toBeGreaterThan(0);
    const current = await send(app, "POST", `/api/rooms/${host.code}/items/${itemId}/current`, {
      ip: "203.0.113.40",
      cookie: host.cookie,
      body: { clientOpId: op(42) },
    });
    expect([200, 201], current.text).toContain(current.status);

    const joined = await send(app, "POST", `/api/rooms/${host.code}/join`, {
      ip: "203.0.113.41",
      body: { nickname: "Bea", role: "dev", mode: "voter", clientOpId: op(43) },
    });
    expect([200, 201], joined.text).toContain(joined.status);
    const guest = sessionFrom(joined.response);
    const voted = await send(app, "POST", `/api/rooms/${host.code}/votes`, {
      ip: "203.0.113.40",
      cookie: host.cookie,
      body: { card: "13", suit: "clubs", comment: SECRET_COMMENT, clientOpId: op(44) },
    });
    expect([200, 201], voted.text).toContain(voted.status);

    const hidden = await send(app, "GET", `/api/rooms/${host.code}/state?since=0`, {
      ip: "203.0.113.41",
      cookie: `fib_session=${guest.token}`,
    });
    expect(hidden.status, hidden.text).toBe(200);
    expect(hidden.text).not.toContain(SECRET_COMMENT);
    expect(hidden.text).not.toContain(host.token);
    const participants = participantsOf(hidden.json);
    expect(participants.map((person) => person.nickname).sort()).toEqual(["Ada", "Bea"]);
    const ada = participants.find((person) => person.nickname === "Ada");
    expect(ada?.hasVoted).toBe(true);
    expect(JSON.stringify(ada)).not.toMatch(/card|suit|comment/);
    expect(votesField(hidden.json)).toBeNull();
    expect(JSON.stringify(events)).not.toContain(SECRET_COMMENT);
    expect(JSON.stringify(events)).not.toMatch(/"card"/);
  });

  it("returns 409 ROOM_FULL for the 31st person", async () => {
    const { app } = testApp();
    const host = await createRoom(app, "203.0.113.50");
    for (let person = 2; person <= MAX_PARTICIPANTS; person += 1) {
      const joined = await send(app, "POST", `/api/rooms/${host.code}/join`, {
        ip: `198.51.100.${person}`,
        body: { nickname: `Guest${person}`, role: "dev", mode: "voter", clientOpId: op(person) },
      });
      expect([200, 201], joined.text).toContain(joined.status);
    }
    const full = await send(app, "POST", `/api/rooms/${host.code}/join`, {
      ip: "198.51.100.31",
      body: { nickname: "Late", role: "dev", mode: "voter", clientOpId: op(45) },
    });
    expect(full.status, full.text).toBe(409);
    expect(full.code).toBe("ROOM_FULL");
  });

  it("returns 413 LIMIT_EXCEEDED when an import would exceed 500 items", async () => {
    const { app } = testApp();
    const host = await createRoom(app, "203.0.113.60");
    const lines = Array.from({ length: MAX_ITEMS_PER_ROOM + 1 }, (_, index) => `Item ${index + 1}`).join("\n");
    const imported = await send(app, "POST", `/api/rooms/${host.code}/items/import`, {
      ip: "203.0.113.60",
      cookie: host.cookie,
      body: { clientOpId: op(46), source: { kind: "text", rawText: lines } },
    });
    expect(imported.status, imported.text).toBe(413);
    expect(imported.code).toBe("LIMIT_EXCEEDED");
  });

  it("rejects a purge without the cron secret and purges one expired room with the secret", async () => {
    const clock = new FakeClock("2026-10-27T15:00:00.000Z");
    const persistence = createSqlitePersistence();
    const roomId = RoomId.create("room-expired-1");
    const code = RoomCode.create("23456789");
    if (!roomId.ok || !code.ok) throw new Error("seed ids");
    const seeded = await persistence.transaction({}, async (repos) => {
      await repos.rooms.save({
        id: roomId.value,
        code: code.value,
        name: "Idle",
        kind: "guest",
        teamId: null,
        status: "open",
        version: 1,
        items: [],
        expiresAt: new Date(clock.now().getTime() - 60_000),
        lastActivityAt: new Date(clock.now().getTime() - 60_000),
      });
      return ok(true);
    });
    expect(seeded.ok).toBe(true);
    const { app } = testApp({ persistence, clock });

    const missing = await send(app, "POST", "/api/internal/cron/purge-expired-rooms", { ip: "203.0.113.70" });
    expect(missing.status, missing.text).toBe(403);

    const forgedHeaders = requestHeaders({ ip: "203.0.113.70" });
    forgedHeaders.set("x-cron-secret", "wrong-secret");
    const forged = await readPayload(
      await app.request("/api/internal/cron/purge-expired-rooms", { method: "POST", headers: forgedHeaders }),
    );
    expect(forged.status, forged.text).toBe(403);

    const headers = requestHeaders({ ip: "203.0.113.70" });
    headers.set("x-cron-secret", CRON_SECRET);
    const purged = await app.request("/api/internal/cron/purge-expired-rooms", { method: "POST", headers });
    const body = await readPayload(purged);
    expect(body.status, body.text).toBe(200);
    expect(body.json).toEqual({ purged: 1 });
    expect(await roomStillThere(persistence, "23456789")).toBe(false);
  });
});

async function roomStillThere(persistence: Persistence, code: string): Promise<boolean> {
  const parsed = RoomCode.create(code);
  if (!parsed.ok) return false;
  const loaded = await persistence.transaction({}, async (repos) => ok(await repos.rooms.findByCode(parsed.value)));
  return loaded.ok && loaded.value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstItemId(json: unknown): string {
  if (!isRecord(json) || !Array.isArray(json.queue)) return "";
  const first = json.queue[0];
  return isRecord(first) && typeof first.id === "string" ? first.id : "";
}

function participantsOf(json: unknown): readonly { readonly nickname?: string; readonly hasVoted?: boolean }[] {
  if (!isRecord(json) || !Array.isArray(json.participants)) return [];
  return json.participants.filter(isRecord) as { nickname?: string; hasVoted?: boolean }[];
}

function votesField(json: unknown): unknown {
  return isRecord(json) ? json.votes : undefined;
}
