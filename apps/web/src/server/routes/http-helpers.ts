import { type AuthProvider, type PersistedUserRecord } from "@fibonaipe/application";
import { createAppError, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { Context } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { errorResponse } from "../error-map.js";
import { jsonResponse } from "../http-error.js";
import { accountUser } from "../account-user.js";
import { accountSessionCookie } from "../session-cookie.js";


export async function sessionUser(c: Context, container: AppContainer): Promise<PersistedUserRecord | null> {
  return accountUser(c, container);
}

export function issuedSessionToken(auth: AuthProvider): string {
  const candidate = auth as AuthProvider & { latestSessionToken?: () => string };
  if (typeof candidate.latestSessionToken !== "function") return "";
  return candidate.latestSessionToken();
}

export function superAdminEmails(): readonly string[] {
  const source = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (source?.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

export function notFound(container: AppContainer): Response {
  return fail(container, createAppError("NOT_FOUND", "errors.NOT_FOUND", {}));
}

export function fail(container: AppContainer, error: AppError): Response {
  return errorResponse(error, container.idGenerator.newId());
}

export function okJson(container: AppContainer, body: unknown, status = 200): Response {
  return jsonResponse(body, status, container.idGenerator.newId());
}

export function jsonWithSession(container: AppContainer, body: unknown, token: string): Response {
  const response = okJson(container, body);
  const headers = new Headers(response.headers);
  headers.append("set-cookie", accountSessionCookie(token));
  return new Response(response.body, { status: response.status, headers });
}

export async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<Result<T, AppError>> {
  let raw: unknown;
  try {
    raw = JSON.parse(await c.req.text()) as unknown;
  } catch {
    return { ok: false, error: createAppError("VALIDATION") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: createAppError("VALIDATION") };
  return ok(parsed.data);
}

export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (!forwarded) return "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

