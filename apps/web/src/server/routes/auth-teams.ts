import {
  CompleteSignIn,
  ActivateSprint,
  CloseSprint,
  CreateSprint,
  GetSprint,
  GetSprintReport,
  GetSprintForecast,
  GetForecastAccuracy,
  GetEstimationIndicators,
  ListSprints,
  ListTeams,
  ListHistory,
  ListTeamMembers,
  ListHolidays,
  DeleteHoliday,
  LinkSprintItem,
  MarkSprintItemDone,
  UnlinkSprintItem,
  SaveHoliday,
  SetSprintCapacityEntries,
  CreateTeam,
  RenameTeam,
  DeleteTeam,
  AddTeamMember,
  CreateInvite,
  AcceptInvite,
  RemoveMember,
  ListTeamTasks,
  CreateTeamTask,
  DeleteTeamTask,
  SendMagicLink,
  type AuthProvider,
  type PersistedUserRecord,
} from "@fibonaipe/application";
import { TeamId, createAppError, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { Context, Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { dependenciesOf } from "../dependencies.js";
import { errorResponse } from "../error-map.js";
import { jsonResponse } from "../http-error.js";
import { accountUser } from "../account-user.js";
import { accountSessionCookie, clearAccountCookie, readAccountToken } from "../session-cookie.js";

const emailSchema = z.object({ email: z.string().trim().min(3).max(320) });
const callbackSchema = z.object({ token: z.string().trim().min(1).max(512) });
const teamSchema = z.object({ name: z.string().trim().min(1).max(80) });
const memberSchema = z.object({ email: z.string().trim().min(3).max(320) });
const taskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sprintName: z.string().trim().max(80).optional(),
  link: z.string().trim().max(2000).optional(),
});
const inviteSchema = z.object({ token: z.string().trim().min(1).max(512) });
const sprintSchema = z.object({ name: z.string().trim().min(1).max(80), startDate: z.string(), endDate: z.string(), goal: z.string().nullable().optional() });
const holidaySchema = z.object({ date: z.string(), name: z.string().trim().min(1).max(80) });
const capacitySchema = z.object({ entries: z.array(z.object({ personId: z.string().min(1), absenceDays: z.number().nonnegative(), focusPct: z.number().min(0).max(100).optional() })) });
const sprintItemSchema = z.object({ roomId: z.string().min(1), itemId: z.string().min(1) });
const doneSchema = z.object({ estimateExceeded: z.boolean().optional() });

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

  app.get("/api/auth/me", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return okJson(container, { user: null });
    return okJson(container, {
      user: { userId: user.id, email: user.email, displayName: user.displayName },
    });
  });

  app.post("/api/auth/logout", async (c) => {
    const token = readAccountToken(c.req.header("cookie"));
    if (token) {
      const identity = await container.authProvider.verifySessionToken(token);
      if (identity.ok) await container.authProvider.revokeUserSessions(identity.value.userId);
    }
    const response = okJson(container, { ok: true });
    const headers = new Headers(response.headers);
    headers.append("set-cookie", clearAccountCookie());
    return new Response(response.body, { status: response.status, headers });
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
    const listed = await container.persistence.transaction({}, async () => ok(user));
    if (!listed.ok) return fail(container, listed.error);
    return okJson(container, { users: [] });
  });

  app.get("/api/teams", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ListTeams(deps).execute({ actorUserId: user.id });
    return result.ok ? okJson(container, { teams: result.value }) : fail(container, result.error);
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

  app.patch("/api/teams/:id", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, teamSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new RenameTeam(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, name: parsed.value.name });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });

  app.delete("/api/teams/:id", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new DeleteTeam(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });

  app.post("/api/teams/:id/members", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, memberSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new AddTeamMember(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, email: parsed.value.email });
    return result.ok ? okJson(container, result.value, 201) : fail(container, result.error);
  });

  app.delete("/api/teams/:id/members/:userId", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new RemoveMember(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, memberUserId: c.req.param("userId") });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });

  app.post("/api/teams/:id/invites", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new CreateInvite(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, role: "dev" });
    if (!result.ok) return fail(container, result.error);
    const link = `${container.env.PUBLIC_APP_URL}/teams?invite=${encodeURIComponent(result.value.token)}`;
    return okJson(container, { link, expiresAt: result.value.expiresAt }, 201);
  });

  app.post("/api/invites/accept", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, inviteSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new AcceptInvite(deps).execute({ token: parsed.value.token, userId: user.id });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });

  app.get("/api/teams/:id/tasks", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ListTeamTasks(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, { tasks: result.value }) : fail(container, result.error);
  });

  app.post("/api/teams/:id/tasks", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, taskSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new CreateTeamTask(deps).execute({
      teamId: c.req.param("id"),
      actorUserId: user.id,
      title: parsed.value.title,
      sprintName: parsed.value.sprintName ?? "",
      link: parsed.value.link ?? "",
    });
    return result.ok ? okJson(container, result.value, 201) : fail(container, result.error);
  });

  app.delete("/api/teams/:id/tasks/:taskId", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new DeleteTeamTask(deps).execute({
      teamId: c.req.param("id"),
      actorUserId: user.id,
      taskId: c.req.param("taskId"),
    });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });

  app.post("/api/teams/:id/sprints", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, sprintSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new CreateSprint(deps).execute({ ...parsed.value, teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, result.value, 201) : fail(container, result.error);
  });
  app.get("/api/teams/:id/sprints", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ListSprints(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, { sprints: result.value }) : fail(container, result.error);
  });
  app.get("/api/teams/:id/sprints/:sprintId", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new GetSprint(deps).execute({ teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, { sprint: result.value }) : fail(container, result.error);
  });
  app.get("/api/teams/:id/forecast", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const capacity = Number(c.req.query("capacity"));
    const result = await new GetSprintForecast(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, plannedCapacity: capacity });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });
  app.get("/api/teams/:id/forecast/accuracy", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const teamId = TeamId.create(c.req.param("id"));
    if (!teamId.ok) return fail(container, teamId.error);
    const [result, permissions] = await Promise.all([
      new GetForecastAccuracy(deps).execute({ teamId: teamId.value, actorUserId: user.id }),
      container.persistence.transaction({}, async (repos) => {
        const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === user.id);
        const account = await repos.users.findById(user.id);
        return ok({ canExport: account?.isSuperAdmin === true || (member !== undefined && member.role !== "observer") });
      }),
    ]);
    if (!result.ok) return fail(container, result.error);
    return okJson(container, { ...result.value, canExport: permissions.ok && permissions.value.canExport });
  });
  app.get("/api/teams/:id/forecast/export", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const teamId = TeamId.create(c.req.param("id"));
    if (!teamId.ok) return fail(container, teamId.error);
    const format = c.req.query("format");
    if (format !== "csv" && format !== "json") return fail(container, createAppError("VALIDATION"));
    const permission = await container.persistence.transaction({}, async (repos) => {
      const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === user.id);
      const account = await repos.users.findById(user.id);
      return ok(account?.isSuperAdmin === true || (member !== undefined && member.role !== "observer"));
    });
    if (!permission.ok || !permission.value) return fail(container, createAppError("FORBIDDEN"));
    const accuracy = await new GetForecastAccuracy(deps).execute({ teamId: teamId.value, actorUserId: user.id });
    if (!accuracy.ok) return fail(container, accuracy.error);
    const from = c.req.query("from"); const to = c.req.query("to");
    const series = accuracy.value.series.filter((row) => (!from || !row.endDate || row.endDate >= from) && (!to || !row.endDate || row.endDate <= to));
    const artifact = format === "csv"
      ? container.exporter.exportCsv({ filenameBase: "forecast", headers: ["sprintId", "predicted", "delivered", "errorPct"], rows: series.map((row) => [row.sprintId, row.predicted, row.delivered, row.errorPct]) })
      : container.exporter.exportJson({ filenameBase: "forecast", schemaVersion: "1.0", data: series });
    if (!artifact.ok) return fail(container, artifact.error);
    c.header("content-type", artifact.value.mimeType);
    c.header("content-disposition", `attachment; filename="${artifact.value.filename}"`);
    return c.body(artifact.value.content);
  });
  app.get("/api/teams/:id/history", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ListHistory(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, limit: 100, cursor: c.req.query("cursor"), text: c.req.query("text") });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });
  app.get("/api/teams/:id/indicators", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const from = c.req.query("from");
    const to = c.req.query("to");
    const result = await new GetEstimationIndicators(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id, from: from === undefined ? undefined : new Date(from), to: to === undefined ? undefined : new Date(to) });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });
  app.post("/api/teams/:id/holidays", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, holidaySchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new SaveHoliday(deps).execute({ ...parsed.value, teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, result.value, 201) : fail(container, result.error);
  });
  app.get("/api/teams/:id/holidays", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ListHolidays(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, { holidays: result.value }) : fail(container, result.error);
  });
  app.put("/api/teams/:id/holidays/:holidayId", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, holidaySchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new SaveHoliday(deps).execute({ ...parsed.value, holidayId: c.req.param("holidayId"), teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });
  app.delete("/api/teams/:id/holidays/:holidayId", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new DeleteHoliday(deps).execute({ holidayId: c.req.param("holidayId"), teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, { ok: true }) : fail(container, result.error);
  });
  app.put("/api/teams/:id/sprints/:sprintId/capacity", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, capacitySchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new SetSprintCapacityEntries(deps).execute({ ...parsed.value, teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, { capacityTotal: result.value }) : fail(container, result.error);
  });
  app.post("/api/teams/:id/sprints/:sprintId/items", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, sprintItemSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new LinkSprintItem(deps).execute({ ...parsed.value, teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, { ok: true }) : fail(container, result.error);
  });
  app.post("/api/teams/:id/sprints/:sprintId/items/:itemId/done", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const parsed = await parseBody(c, doneSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const result = await new MarkSprintItemDone(deps).execute({ ...parsed.value, itemId: c.req.param("itemId"), teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, { ok: true }) : fail(container, result.error);
  });
  app.delete("/api/teams/:id/sprints/:sprintId/items/:itemId", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new UnlinkSprintItem(deps).execute({ itemId: c.req.param("itemId"), teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, { ok: true }) : fail(container, result.error);
  });

  app.post("/api/teams/:id/sprints/:sprintId/activate", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ActivateSprint(deps).execute({ teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, { ok: true }) : fail(container, result.error);
  });

  app.post("/api/teams/:id/sprints/:sprintId/close", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new CloseSprint(deps).execute({ teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
  });

  app.get("/api/teams/:id/sprints/:sprintId/report", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new GetSprintReport(deps).execute({ teamId: c.req.param("id"), sprintId: c.req.param("sprintId"), actorUserId: user.id });
    return result.ok ? okJson(container, result.value) : fail(container, result.error);
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
  app.get("/api/teams/:id/members", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return fail(container, createAppError("FORBIDDEN"));
    const result = await new ListTeamMembers(deps).execute({ teamId: c.req.param("id"), actorUserId: user.id });
    return result.ok ? okJson(container, { members: result.value }) : fail(container, result.error);
  });
}

async function sessionUser(c: Context, container: AppContainer): Promise<PersistedUserRecord | null> {
  return accountUser(c, container);
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
  headers.append("set-cookie", accountSessionCookie(token));
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
