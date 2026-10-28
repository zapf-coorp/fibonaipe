import {
  CompleteSignIn,
  CreateTeam,
  SendMagicLink,
  type AuthProvider,
  type PersistedUserRecord,
  type UseCaseDependencies,
} from "@fibonaipe/application";
import { TeamId, UserId, createAppError, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { Context, Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { errorResponse } from "../error-map.js";
import { jsonResponse } from "../http-error.js";
import { guestSessionCookie, readSessionToken } from "../session-cookie.js";

const emailSchema = z.object({ email: z.string().trim().min(3).max(320) });
const callbackSchema = z.object({ token: z.string().trim().min(1).max(512) });
const teamSchema = z.object({ name: z.string().trim().min(1).max(80) });

export function registerAuthTeamRoutes(app: Hono, container: AppContainer): void {
  const deps = dependenciesOf(container);

  app.post("/api/auth/magic-link", async (c) => {
    const parsed = await parseBody(c, emailSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const sent = await new SendMagicLink(deps, container.authProvider).execute({
      email: parsed.value.email,
      ip: clientIp(c),
      redirectUrl: `${container.env.PUBLIC_APP_URL}/api/auth/callback`,
    });
    if (!sent.ok) return fail(container, sent.error);
    return okJson(container, { ok: true });
  });

  app.post("/api/auth/callback", async (c) => {
    const parsed = await parseBody(c, callbackSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const signedIn = await new CompleteSignIn(deps, container.authProvider).execute({
      token: parsed.value.token,
      superAdminEmails: superAdminEmails(),
    });
    if (!signedIn.ok) return fail(container, signedIn.error);
    return jsonWithSession(
      container,
      { userId: signedIn.value.userId, email: signedIn.value.email, isSuperAdmin: signedIn.value.isSuperAdmin },
      issuedSessionToken(container.authProvider),
    );
  });

  app.get("/api/admin/users", async (c) => {
    const user = await sessionUser(c, container);
    if (!user || user.isSuperAdmin !== true) return fail(container, createAppError("FORBIDDEN"));
    const listed = await container.persistence.transaction({}, async (repos) => ok(user));
    if (!listed.ok) return fail(container, listed.error);
    return okJson(container, { users: [] });
  });

  app.post("/api/teams", async (c) => {
    const parsed = await parseBody(c, teamSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const created = await new CreateTeam(deps).execute({ name: parsed.value.name, creatorUserId: user.id });
    if (!created.ok) return fail(container, created.error);
    return okJson(container, { teamId: created.value.teamId, role: created.value.role }, 201);
  });

  app.get("/api/teams/:id", async (c) => {
    const missing = notFound(container);
    const teamId = TeamId.create(c.req.param("id"));
    if (!teamId.ok) return missing;
    const user = await sessionUser(c, container);
    if (!user) return missing;
    const loaded = await container.persistence.transaction({}, async (repos) => {
      const team = await repos.teams.findById(teamId.value);
      if (!team) return ok(null);
      const memberships = await repos.memberships.listByUser(user.id);
      const member = memberships.some((membership) => membership.teamId === team.id);
      return ok(member ? team : null);
    });
    if (!loaded.ok || loaded.value === null) return missing;
    return okJson(container, { teamId: loaded.value.id, name: loaded.value.name });
  });
}

function dependenciesOf(container: AppContainer): UseCaseDependencies {
  return {
    persistence: container.persistence,
    realtime: container.realtime,
    ids: container.idGenerator,
    clock: container.clock,
    rateLimiter: container.rateLimiter,
    issueTracker: container.issueTracker,
    exporter: container.exporter,
    logger: container.logger,
  };
}

async function sessionUser(c: Context, container: AppContainer): Promise<PersistedUserRecord | null> {
  const token = readSessionToken(c.req.header("cookie"));
  if (!token) return null;
  const identity = await container.authProvider.verifySessionToken(token);
  if (!identity.ok) return null;
  const userId = UserId.create(identity.value.userId);
  if (!userId.ok) return null;
  const loaded = await container.persistence.transaction({}, async (repos) => ok(await repos.users.findById(userId.value)));
  if (!loaded.ok) return null;
  return loaded.value;
}

function issuedSessionToken(auth: AuthProvider): string {
  const candidate = auth as AuthProvider & { latestSessionToken?: () => string };
  if (typeof candidate.latestSessionToken !== "function") return "";
  return candidate.latestSessionToken();
}

function superAdminEmails(): readonly string[] {
  const source = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (source?.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function notFound(container: AppContainer): Response {
  return fail(container, createAppError("NOT_FOUND", "errors.NOT_FOUND", {}));
}

function fail(container: AppContainer, error: AppError): Response {
  return errorResponse(error, container.idGenerator.newId());
}

function okJson(container: AppContainer, body: unknown, status = 200): Response {
  return jsonResponse(body, status, container.idGenerator.newId());
}

function jsonWithSession(container: AppContainer, body: unknown, token: string): Response {
  const response = okJson(container, body);
  const headers = new Headers(response.headers);
  headers.append("set-cookie", guestSessionCookie(token));
  return new Response(response.body, { status: response.status, headers });
}

async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<Result<T, AppError>> {
  let raw: unknown;
  try {
    raw = JSON.parse(await c.req.text()) as unknown;
  } catch {
    return { ok: false, error: createAppError("VALIDATION") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: createAppError("VALIDATION") };
  return ok(parsed.data);
}

function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (!forwarded) return "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}
