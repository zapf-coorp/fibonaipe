import type { Hono } from "hono";
import { app } from "./app.js";

export function createDevGateway(): Hono {
  return app;
}
