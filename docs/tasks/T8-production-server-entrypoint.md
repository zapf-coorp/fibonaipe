# T8 — Production Node/Hono Server Entrypoint & Auto-Migrate

**Status:** TODO  
**Depends on:** T2, T4, T7  
**Max files to touch:** 4 (`apps/web/src/server/main.ts`, `apps/web/package.json`, `package.json`, `apps/web/tsconfig.json`)

## Goal

Provide a single-process production server (`npm start`) using `@hono/node-server` that:
1. Validates environment variables (`loadServerEnv()`).
2. Automatically applies PostgreSQL SQL migrations on startup when `PERSISTENCE_DRIVER === "postgres"` and `DATABASE_URL` is set.
3. Serves `/healthz` and `/api/*` through the Hono `app`.
4. Serves the built Vite frontend assets from `apps/web/dist/client` with SPA fallback (`index.html`) for client-side routes (`/r/:code`, `/teams`, `/login`, etc.).

## Step-by-Step Instructions

### 1. Create `apps/web/src/server/main.ts`

Use only Node built-ins (`node:fs`, `node:path`, `node:url`) and `@hono/node-server` (already installed in `apps/web/package.json`):
```ts
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { applyPostgresMigrations } from "@fibonaipe/adapter-persistence-postgres";
import { createApp } from "./app.js";
import { createAppContainer } from "./composition.js";

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export async function startProductionServer(): Promise<void> {
  const container = createAppContainer();
  if (container.env.PERSISTENCE_DRIVER === "postgres" && container.env.DATABASE_URL) {
    await applyPostgresMigrations({ DATABASE_URL: container.env.DATABASE_URL });
  }
  const apiApp = createApp(container);
  const clientDir = resolve(dirnameFromMeta(), "../../dist/client");

  serve({
    port: container.env.PORT,
    fetch: async (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/healthz" || url.pathname.startsWith("/api/")) {
        return apiApp.fetch(request);
      }
      return serveStaticOrSpa(clientDir, url.pathname);
    },
  });
}
```
- Implement `serveStaticOrSpa(clientDir, pathname)` safely preventing path traversal (`!fullPath.startsWith(clientDir)`), serving matching static files from `dist/client`, and falling back to `dist/client/index.html` for navigation routes.
- When `main.ts` is executed directly as CLI, call `void startProductionServer()`.

### 2. Add Scripts to `apps/web/package.json` and Root `package.json`

1. In `apps/web/package.json`:
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "start": "node --import tsx src/server/main.ts"
   }
   ```
   *(Or compile server TypeScript via `tsc` and run `node dist/server/main.js` — check if `tsx` is in `node_modules` or use Node v24 native `--experimental-strip-types` `node --experimental-strip-types src/server/main.ts`, which requires zero extra dependencies on Node 24!)*
2. In root `package.json`:
   - Add `"start": "npm run start --workspace=@fibonaipe/web"`.

### 3. Write Unit Test for Static / API Dispatch

Add a fast unit test verifying that `/api/*` and `/healthz` route to Hono while unknown GET paths serve the SPA shell.

## Verification

Run:
```sh
npm run build
npm run lint
npm run typecheck
npx vitest run
```
