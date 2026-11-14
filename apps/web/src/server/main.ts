import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { applyPostgresMigrations } from "@fibonaipe/adapter-persistence-postgres";
import type { Hono } from "hono";
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

/** Build output of `vite build` (see apps/web/package.json). */
export const CLIENT_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../client");

/**
 * Serves one GET request from the built client. Files that exist are returned
 * as-is; any extension-less path (a client route such as `/teams`) gets the SPA
 * shell. Paths that resolve outside `clientDir` are refused.
 */
export function serveStaticOrSpa(clientDir: string, pathname: string): Response {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const root = resolve(clientDir);
  const candidate = resolve(root, `.${decoded}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (isFile(candidate)) return fileResponse(candidate);
  if (extname(decoded) === "") {
    const shell = join(root, "index.html");
    if (existsSync(shell)) return fileResponse(shell);
  }
  return new Response("Not found", { status: 404 });
}

/** Routes `/healthz` and `/api/*` to Hono; everything else is static or SPA. */
export function createProductionFetch(
  apiApp: Pick<Hono, "fetch">,
  clientDir: string,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/healthz" || pathname.startsWith("/api/")) return apiApp.fetch(request);
    return serveStaticOrSpa(clientDir, pathname);
  };
}

export async function startProductionServer(): Promise<void> {
  const container = createAppContainer();
  if (container.env.PERSISTENCE_DRIVER === "postgres" && container.env.DATABASE_URL) {
    await applyPostgresMigrations({ DATABASE_URL: container.env.DATABASE_URL });
  }
  serve({
    port: container.env.PORT,
    fetch: createProductionFetch(createApp(container), CLIENT_DIR),
  });
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function fileResponse(path: string): Response {
  const type = MIME_TYPES[extname(path)] ?? "application/octet-stream";
  const cache = path.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache";
  return new Response(new Uint8Array(readFileSync(path)), {
    headers: { "content-type": type, "cache-control": cache },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void startProductionServer();
}
