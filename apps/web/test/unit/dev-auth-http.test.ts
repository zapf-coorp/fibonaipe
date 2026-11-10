import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { createAppContainer, type AppContainer } from "../../src/server/composition.js";

const ORIGIN = "http://localhost:5173";

interface Payload {
  readonly status: number;
  readonly json: unknown;
  readonly response: Response;
}

function devApp(): { app: ReturnType<typeof createApp>; container: AppContainer } {
  const container = createAppContainer({
    NODE_ENV: "test",
    AUTH_DRIVER: "dev-fake",
    PUBLIC_APP_URL: ORIGIN,
    PERSISTENCE_DRIVER: "in-memory",
    REALTIME_DRIVER: "fake",
  });
  return { app: createApp(container), container };
}

async function send(
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  input: { readonly ip?: string; readonly cookie?: string; readonly body?: unknown } = {},
): Promise<Payload> {
  const headers = new Headers();
  headers.set("origin", ORIGIN);
  headers.set("content-type", "application/json");
  headers.set("x-forwarded-for", input.ip ?? "203.0.113.70");
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
  return { status: response.status, json, response };
}

function sessionCookie(response: Response): string {
  const listed = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const header = listed.find((value) => value.toLowerCase().includes("fib_account=")) ?? response.headers.get("set-cookie") ?? "";
  return header.split(";")[0]?.trim() ?? "";
}

function teamId(payload: Payload): string {
  const json = payload.json;
  if (typeof json !== "object" || json === null || !("teamId" in json)) throw new Error("missing teamId");
  const value = (json as { teamId: unknown }).teamId;
  if (typeof value !== "string") throw new Error("invalid teamId");
  return value;
}

describe("dev auth HTTP", () => {
  it("lists the four fake users with Host first", async () => {
    const { app } = devApp();
    const status = await send(app, "GET", "/api/dev/auth/status");
    expect(status.status).toBe(200);
    const body = status.json as { enabled: boolean; users: Array<{ displayName: string; email: string }> };
    expect(body.enabled).toBe(true);
    expect(body.users).toHaveLength(4);
    expect(body.users[0]).toMatchObject({ displayName: "Host", email: "host@fibonaipe.dev" });
  });

  it("signs in with email and creates a team", async () => {
    const { app } = devApp();
    const login = await send(app, "POST", "/api/dev/auth/login", {
      body: { email: "host@fibonaipe.dev", method: "email" },
    });
    expect(login.status).toBe(200);
    expect(login.json).toMatchObject({ method: "email", user: { email: "host@fibonaipe.dev" } });
    const cookie = sessionCookie(login.response);
    expect(cookie).toContain("fib_account=");

    const before = await send(app, "GET", "/api/teams", { cookie });
    expect(before.status).toBe(200);
    expect(before.json).toEqual({ teams: [] });

    const created = await send(app, "POST", "/api/teams", { cookie, body: { name: "Falcons" } });
    expect(created.status).toBe(201);

    const after = await send(app, "GET", "/api/teams", { cookie });
    expect(after.json).toMatchObject({ teams: [{ teamId: teamId(created), name: "Falcons", role: "teamAdmin" }] });
  });

  it("signs in with the fake Google flow", async () => {
    const { app } = devApp();
    const login = await send(app, "POST", "/api/dev/auth/login", {
      body: { email: "alice@fibonaipe.dev", method: "google" },
    });
    expect(login.status).toBe(200);
    expect(login.json).toMatchObject({ method: "google", user: { email: "alice@fibonaipe.dev" } });
    const cookie = sessionCookie(login.response);
    expect((await send(app, "GET", "/api/teams", { cookie })).json).toEqual({ teams: [] });
  });

  it("revokes the session on logout", async () => {
    const { app } = devApp();
    const login = await send(app, "POST", "/api/dev/auth/login", {
      body: { email: "bruno@fibonaipe.dev", method: "email" },
    });
    const cookie = sessionCookie(login.response);
    expect((await send(app, "GET", "/api/teams", { cookie })).status).toBe(200);

    const logout = await send(app, "POST", "/api/dev/auth/logout", { cookie });
    expect(logout.status).toBe(200);
    expect((await send(app, "GET", "/api/teams", { cookie })).status).toBe(403);
  });

  it("does not expose the routes when dev auth is unavailable", async () => {
    const container = createAppContainer({
      NODE_ENV: "test",
      AUTH_DRIVER: "unavailable",
      PUBLIC_APP_URL: ORIGIN,
      PERSISTENCE_DRIVER: "in-memory",
      REALTIME_DRIVER: "fake",
    });
    const app = createApp(container);
    expect((await send(app, "GET", "/api/dev/auth/status")).status).toBe(404);
  });
});
