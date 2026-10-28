import {
  MAX_ITEM_TITLE_LENGTH,
  MAX_NICKNAME_LENGTH,
  createAppError,
  err,
  ok as success,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import type { IssueTrackerImportInput } from "@fibonaipe/application";
import type { Context, Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { errorResponse } from "../error-map.js";
import { jsonResponse } from "../http-error.js";
import { guestSessionCookie, readSessionToken, secretsMatch } from "../session-cookie.js";
import { createRoomUseCases, type RoomUseCases } from "../use-cases.js";

const ROOM_NAME_MAX = 80;
const clientOpId = z.string().trim().min(1).max(64);
const nickname = z.string().trim().min(1).max(MAX_NICKNAME_LENGTH);

const createSchema = z.object({
  name: z.string().trim().min(1).max(ROOM_NAME_MAX),
  hostNickname: nickname,
});

const joinSchema = z.object({
  nickname,
  role: z.string().trim().min(1).max(40),
  mode: z.enum(["voter", "observer"]),
  clientOpId,
});

const opSchema = z.object({ clientOpId });

const addItemSchema = opSchema.extend({
  title: z.string().trim().min(1).max(MAX_ITEM_TITLE_LENGTH),
  description: z.string().max(2000).optional(),
});

const voteSchema = opSchema.extend({
  card: z.string().trim().min(1).max(16),
  suit: z.string().trim().min(1).max(16).nullable().optional(),
  comment: z.string().max(140).nullable().optional(),
});

const importSchema = opSchema.extend({
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("text"), rawText: z.string() }),
    z.object({ kind: z.literal("csv"), csvContent: z.string(), delimiter: z.string().optional() }),
    z.object({
      kind: z.literal("external"),
      encryptedToken: z.string(),
      workspaceOrProjectKey: z.string(),
      queryOrListId: z.string(),
      maxItems: z.number().int().positive(),
    }),
  ]),
});

const reorderSchema = opSchema.extend({
  itemIds: z.array(z.string().min(1).max(64)).min(1),
});

const settingsSchema = opSchema.extend({
  autoReveal: z.boolean().optional(),
  showAverage: z.boolean().optional(),
  timerSeconds: z.number().int().nullable().optional(),
  allowObserverComments: z.boolean().optional(),
  suitAxisEnabled: z.boolean().optional(),
  suitAxisLabelKey: z.string().max(80).optional(),
});

const transferSchema = opSchema.extend({
  targetParticipantId: z.string().trim().min(1).max(64),
});

const estimateSchema = opSchema.extend({
  label: z.string().trim().min(1).max(16),
  suit: z.string().trim().min(1).max(16).nullable().optional(),
});

const newRoundSchema = opSchema.extend({
  itemId: z.string().trim().min(1).max(64),
});

export function registerRoomRoutes(app: Hono, container: AppContainer): void {
  const useCases = createRoomUseCases(container);

  app.post("/api/rooms", async (c) => {
    const parsed = await parseBody(c, createSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const created = await useCases.createRoom.execute({
      name: parsed.value.name,
      hostNickname: parsed.value.hostNickname,
      ip: clientIp(c),
    });
    if (!created.ok) return fail(container, created.error);
    return jsonWithSession(container, { code: created.value.code }, 201, created.value.hostToken);
  });

  app.post("/api/rooms/:code/join", async (c) => {
    const parsed = await parseBody(c, joinSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const joined = await useCases.joinRoom.execute({
      code: c.req.param("code"),
      nickname: parsed.value.nickname,
      role: parsed.value.role,
      mode: parsed.value.mode,
      clientOpId: parsed.value.clientOpId,
      ip: clientIp(c),
    });
    if (!joined.ok) return fail(container, joined.error);
    return jsonWithSession(container, { participantId: joined.value.participantId }, 201, joined.value.sessionToken);
  });

  app.get("/api/rooms/:code/state", async (c) => {
    const actor = await actorId(c, useCases);
    if (!actor.ok) return fail(container, actor.error);
    const since = Number(c.req.query("since") ?? "0");
    if (!Number.isInteger(since) || since < 0) return fail(container, createAppError("VALIDATION"));
    const snapshot = await useCases.snapshot.execute({
      code: c.req.param("code"),
      since,
      viewer: { kind: "participant", participantId: actor.value },
    });
    if (!snapshot.ok) return fail(container, snapshot.error);
    if (snapshot.value.unchanged) return ok(container, { unchanged: true, version: snapshot.value.version });
    return ok(container, snapshot.value.view);
  });

  app.post("/api/rooms/:code/heartbeat", (c) =>
    runActor(c, container, useCases, opSchema, (actor, body) =>
      useCases.heartbeat.execute({
        code: c.req.param("code"),
        participantId: actor,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.post("/api/rooms/:code/votes", (c) =>
    runActor(c, container, useCases, voteSchema, (actor, body) =>
      useCases.castVote.execute({
        code: c.req.param("code"),
        participantId: actor,
        card: body.card,
        suit: body.suit,
        comment: body.comment,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.delete("/api/rooms/:code/votes", (c) =>
    runActor(c, container, useCases, opSchema, (actor, body) =>
      useCases.retractVote.execute({
        code: c.req.param("code"),
        participantId: actor,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.post("/api/rooms/:code/reveal", (c) =>
    runActor(c, container, useCases, opSchema, (actor, body) =>
      useCases.revealRound.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.post("/api/rooms/:code/rounds", (c) =>
    runActor(c, container, useCases, newRoundSchema, (actor, body) =>
      useCases.newRound.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        itemId: body.itemId,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.put("/api/rooms/:code/items/:id/estimate", (c) =>
    runActor(c, container, useCases, estimateSchema, (actor, body) =>
      useCases.setFinalEstimate.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        itemId: c.req.param("id"),
        label: body.label,
        suit: body.suit,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.post("/api/rooms/:code/items", (c) =>
    runActor(c, container, useCases, addItemSchema, (actor, body) =>
      useCases.addItem.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        title: body.title,
        description: body.description,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.post("/api/rooms/:code/items/import", (c) =>
    runActor(c, container, useCases, importSchema, (actor, body) =>
      useCases.importItems.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        clientOpId: body.clientOpId,
        source: body.source as IssueTrackerImportInput,
      }),
    ),
  );

  app.post("/api/rooms/:code/items/reorder", (c) =>
    runActor(c, container, useCases, reorderSchema, (actor, body) =>
      useCases.reorderItems.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        itemIds: body.itemIds,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.post("/api/rooms/:code/items/:id/current", (c) => itemAction(c, container, useCases, "current"));
  app.post("/api/rooms/:code/items/:id/skip", (c) => itemAction(c, container, useCases, "skip"));
  app.post("/api/rooms/:code/items/:id/defer", (c) => itemAction(c, container, useCases, "defer"));

  app.patch("/api/rooms/:code/settings", (c) =>
    runActor(c, container, useCases, settingsSchema, (actor, body) =>
      useCases.updateSettings.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        clientOpId: body.clientOpId,
        autoReveal: body.autoReveal,
        showAverage: body.showAverage,
        timerSeconds: body.timerSeconds,
        allowObserverComments: body.allowObserverComments,
        suitAxisEnabled: body.suitAxisEnabled,
        suitAxisLabelKey: body.suitAxisLabelKey,
      }),
    ),
  );

  app.post("/api/rooms/:code/host", (c) =>
    runActor(c, container, useCases, transferSchema, (actor, body) =>
      useCases.transferHost.execute({
        code: c.req.param("code"),
        actorParticipantId: actor,
        targetParticipantId: body.targetParticipantId,
        clientOpId: body.clientOpId,
      }),
    ),
  );

  app.get("/api/rooms/:code/summary", async (c) => {
    const actor = await actorId(c, useCases);
    if (!actor.ok) return fail(container, actor.error);
    const format = c.req.query("format") === "csv" ? "csv" : c.req.query("format") === "json" ? "json" : null;
    if (!format) return fail(container, createAppError("VALIDATION"));
    const exported = await useCases.exportSummary.execute({
      code: c.req.param("code"),
      participantId: actor.value,
      format,
    });
    if (!exported.ok) return fail(container, exported.error);
    const requestId = container.idGenerator.newId();
    return new Response(exported.value.content, {
      status: 200,
      headers: {
        "content-type": exported.value.mimeType,
        "cache-control": "no-store, no-cache, must-revalidate",
        "x-request-id": requestId,
      },
    });
  });

  app.post("/api/internal/cron/purge-expired-rooms", async (c) => {
    const provided = c.req.header("x-cron-secret") ?? "";
    if (!secretsMatch(provided, container.env.CRON_SECRET)) return fail(container, createAppError("FORBIDDEN"));
    const purged = await useCases.purge.execute();
    if (!purged.ok) return fail(container, purged.error);
    return ok(container, { purged: purged.value.count });
  });
}

async function itemAction(
  c: Context,
  container: AppContainer,
  useCases: RoomUseCases,
  action: "current" | "skip" | "defer",
): Promise<Response> {
  return runActor(c, container, useCases, opSchema, (actor, body) => {
    const code = c.req.param("code");
    const itemId = c.req.param("id");
    if (!code || !itemId) return Promise.resolve(err(createAppError("VALIDATION")));
    const input = {
      code,
      actorParticipantId: actor,
      itemId,
      clientOpId: body.clientOpId,
    };
    if (action === "current") return useCases.setCurrentItem.execute(input);
    if (action === "skip") return useCases.skipItem.execute(input);
    return useCases.deferItem.execute(input);
  });
}

async function runActor<T>(
  c: Context,
  container: AppContainer,
  useCases: RoomUseCases,
  schema: z.ZodType<T>,
  work: (actorParticipantId: string, body: T) => Promise<Result<{ readonly realtimePending: boolean }, AppError>>,
): Promise<Response> {
  const parsed = await parseBody(c, schema);
  if (!parsed.ok) return fail(container, parsed.error);
  const actor = await actorId(c, useCases);
  if (!actor.ok) return fail(container, actor.error);
  const result = await work(actor.value, parsed.value);
  if (!result.ok) return fail(container, result.error);
  return ok(container, { ok: true, realtimePending: result.value.realtimePending });
}

async function actorId(c: Context, useCases: RoomUseCases): Promise<Result<string, AppError>> {
  const token = readSessionToken(c.req.header("cookie"));
  const code = c.req.param("code");
  if (!token) return err(createAppError("FORBIDDEN"));
  if (!code) return err(createAppError("VALIDATION"));
  const reconnected = await useCases.reconnect.execute({ code, sessionToken: token });
  if (!reconnected.ok) return reconnected;
  return success(reconnected.value.participantId);
}

async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<Result<T, AppError>> {
  let raw: unknown;
  try {
    raw = JSON.parse(await c.req.text()) as unknown;
  } catch {
    return err(createAppError("VALIDATION"));
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return err(createAppError("VALIDATION"));
  return success(parsed.data);
}

function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (!forwarded) return "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function fail(container: AppContainer, error: AppError): Response {
  return errorResponse(error, container.idGenerator.newId());
}

function ok(container: AppContainer, body: unknown, status = 200): Response {
  return jsonResponse(body, status, container.idGenerator.newId());
}

function jsonWithSession(container: AppContainer, body: unknown, status: number, token: string): Response {
  const response = jsonResponse(body, status, container.idGenerator.newId());
  const headers = new Headers(response.headers);
  headers.append("set-cookie", guestSessionCookie(token));
  return new Response(response.body, { status: response.status, headers });
}
