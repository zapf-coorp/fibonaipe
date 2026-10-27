import { Hono } from "hono";

const PUBLIC_ORIGIN = "http://localhost:5173";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function createDevGateway(): Hono {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (!MUTATING.has(c.req.method.toUpperCase())) {
      await next();
      return;
    }
    const origin = c.req.header("origin") ?? c.req.header("x-fibonaipe-origin");
    if (origin && origin !== PUBLIC_ORIGIN) {
      return c.json(
        { error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" } },
        403,
        { "cache-control": "no-store, no-cache, must-revalidate" },
      );
    }
    await next();
  });
  app.get("/healthz", (c) => health(c));
  app.get("/api/healthz", (c) => health(c));
  return app;
}

function health(c: { json: (body: unknown, status?: number) => Response }): Response {
  return c.json(
    {
      status: "ok",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks: { persistence: "ok" },
    },
    200,
  );
}
