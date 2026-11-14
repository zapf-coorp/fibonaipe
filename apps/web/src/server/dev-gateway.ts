import type { Hono } from "hono";
import { createApp } from "./app.js";
import { createAppContainer } from "./composition.js";

// The Vite dev server is the only caller. Keep one container so in-memory
// persistence survives across requests, and always expose the fake sign-in.
const devApp = createApp(
  createAppContainer({
    NODE_ENV: "development",
    AUTH_DRIVER: "dev-fake",
    PERSISTENCE_DRIVER: "sqlite",
  }),
);

export function createDevGateway(): Hono {
  return devApp;
}
