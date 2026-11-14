import { ActivateSprint, CloseSprint, CreateSprint, GetSprint, GetSprintReport, GetSprintForecast, GetForecastAccuracy, GetEstimationIndicators, ListSprints, ListHistory, ListHolidays, DeleteHoliday, LinkSprintItem, MarkSprintItemDone, UnlinkSprintItem, SaveHoliday, SetSprintCapacityEntries } from "@fibonaipe/application";
import { TeamId, createAppError, ok } from "@fibonaipe/domain";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { dependenciesOf } from "../dependencies.js";
import { sessionUser, fail, okJson, parseBody } from "./http-helpers.js";

const sprintSchema = z.object({ name: z.string().trim().min(1).max(80), startDate: z.string(), endDate: z.string(), goal: z.string().nullable().optional() });
const holidaySchema = z.object({ date: z.string(), name: z.string().trim().min(1).max(80) });
const capacitySchema = z.object({ entries: z.array(z.object({ personId: z.string().min(1), absenceDays: z.number().nonnegative(), focusPct: z.number().min(0).max(100).optional() })) });
const sprintItemSchema = z.object({ roomId: z.string().min(1), itemId: z.string().min(1) });
const doneSchema = z.object({ estimateExceeded: z.boolean().optional() });

export function registerSprintRoutes(app: Hono, container: AppContainer): void {
  const deps = dependenciesOf(container);

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

}
