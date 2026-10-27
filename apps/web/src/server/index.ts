import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadServerEnv } from "./env.js";

const env = loadServerEnv();
serve({
  fetch: createApp().fetch,
  port: env.PORT,
});
