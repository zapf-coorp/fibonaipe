import { ListTeams, ListTeamMembers, CreateTeam, RenameTeam, DeleteTeam, AddTeamMember, CreateInvite, AcceptInvite, RemoveMember, ListTeamTasks, CreateTeamTask, DeleteTeamTask } from "@fibonaipe/application";
import { TeamId, createAppError, ok } from "@fibonaipe/domain";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { dependenciesOf } from "../dependencies.js";
import { sessionUser, notFound, fail, okJson, parseBody } from "./http-helpers.js";

const teamSchema = z.object({ name: z.string().trim().min(1).max(80) });
const memberSchema = z.object({ email: z.string().trim().min(3).max(320) });
const taskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sprintName: z.string().trim().max(80).optional(),
  link: z.string().trim().max(2000).optional(),
});
const inviteSchema = z.object({ token: z.string().trim().min(1).max(512) });

export function registerTeamRoutes(app: Hono, container: AppContainer): void {
  const deps = dependenciesOf(container);

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
