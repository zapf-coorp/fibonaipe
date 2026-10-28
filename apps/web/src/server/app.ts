import { Hono, type Context } from "hono";
import { createAppContainer, type AppContainer } from "./composition.js";
import { httpErrorBody, jsonResponse } from "./http-error.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAuthTeamRoutes } from "./routes/auth-teams.js";
import { registerRoomRoutes } from "./routes/rooms.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ORIGIN_HEADER = "x-fibonaipe-origin";

export function createApp(container: AppContainer = createAppContainer()): Hono {
  const app = new Hono();
  app.use("*", async (c, next) => {
    const denied = crossOriginDenied(c, container);
    if (denied) return denied;
    await next();
  });
  registerHealthRoutes(app, container);
  registerRoomRoutes(app, container);
  registerAuthTeamRoutes(app, container);
  app.on(["POST", "PUT", "PATCH", "DELETE"], "*", (c) => {
    const denied = crossOriginDenied(c, container);
    if (denied) return denied;
    return c.notFound();
  });
  const call = app.request.bind(app);
  app.request = ((input: RequestInfo | URL, init?: RequestInit, ...rest: unknown[]) => {
    const origin = originFromInit(init);
    if (!origin) return call(input, init, ...rest);
    const headers = new Headers(init?.headers);
    headers.set(ORIGIN_HEADER, origin);
    return call(input, { ...init, headers }, ...rest);
  }) as typeof app.request;
  return app;
}

function crossOriginDenied(c: Context, container: AppContainer): Response | undefined {
  const method = c.req.method.toUpperCase();
  if (!MUTATING.has(method)) return undefined;
  const origin = c.req.header("origin") ?? c.req.header(ORIGIN_HEADER);
  if (!origin || origin === container.env.PUBLIC_APP_URL) return undefined;
  const requestId = container.idGenerator.newId();
  container.logger.info({ event: "http.forbidden", requestId });
  const mapped = httpErrorBody("FORBIDDEN", "errors.FORBIDDEN");
  return jsonResponse(mapped.body, mapped.status, requestId);
}

function originFromInit(init?: RequestInit): string | undefined {
  const headers = init?.headers;
  if (!headers) return undefined;
  if (typeof Headers !== "undefined" && headers instanceof Headers) return headers.get("origin") ?? undefined;
  if (Array.isArray(headers)) {
    const pair = headers.find((entry) => entry[0].toLowerCase() === "origin");
    return pair?.[1];
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "origin" && typeof value === "string") return value;
  }
  return undefined;
}

export const app = createApp();
