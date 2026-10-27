import type { Hono } from "hono";
import type { AppContainer } from "../composition.js";
import { jsonResponse } from "../http-error.js";

const VERSION = "0.1.0";

export function registerHealthRoutes(app: Hono, container: AppContainer): void {
  const handler = () => healthResponse(container);
  app.get("/healthz", handler);
  app.get("/api/healthz", handler);
}

export async function healthResponse(container: AppContainer): Promise<Response> {
  const requestId = container.idGenerator.newId();
  const timestamp = container.clock.now().toISOString();
  const ping = await container.persistence.ping();
  container.logger.info({ event: "http.health", requestId });
  if (!ping.ok) {
    return jsonResponse(
      {
        status: "error",
        version: VERSION,
        timestamp,
        checks: { persistence: "failed" },
        error: { code: "SERVICE_UNAVAILABLE", messageKey: "errors.SERVICE_UNAVAILABLE" },
      },
      503,
      requestId,
    );
  }
  return jsonResponse(
    {
      status: "ok",
      version: VERSION,
      timestamp,
      checks: { persistence: "ok" },
    },
    200,
    requestId,
  );
}
