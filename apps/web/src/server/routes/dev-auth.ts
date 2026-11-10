import { CompleteIdentitySignIn } from "@fibonaipe/application";
import { createAppError, type AppError, type Result } from "@fibonaipe/domain";
import type { Context, Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { dependenciesOf } from "../dependencies.js";
import { errorResponse } from "../error-map.js";
import { jsonResponse } from "../http-error.js";
import { accountSessionCookie, clearAccountCookie, readAccountToken } from "../session-cookie.js";
import { isDevAuthProvider } from "@fibonaipe/adapter-auth-devfake";

const loginSchema = z.object({
  email: z.string().trim().min(3).max(320),
  method: z.enum(["email", "google"]).default("email"),
});

export function registerDevAuthRoutes(app: Hono, container: AppContainer): void {
  const provider = container.authProvider;
  if (!isDevAuthProvider(provider)) return;
  const deps = dependenciesOf(container);

  app.get("/api/dev/auth/status", () =>
    okJson(container, { enabled: true, users: provider.listUsers() }),
  );

  app.post("/api/dev/auth/login", async (c) => {
    const parsed = await parseBody(c, loginSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const signedIn = parsed.value.method === "google"
      ? await provider.signInWithGoogle(parsed.value.email)
      : await provider.signInWithEmail(parsed.value.email);
    if (!signedIn.ok) return fail(container, signedIn.error);
    const persisted = await new CompleteIdentitySignIn(deps).execute({
      identity: signedIn.value.identity,
      superAdminEmails: superAdminEmails(),
    });
    if (!persisted.ok) return fail(container, persisted.error);
    return jsonWithSession(
      container,
      { user: persisted.value, method: signedIn.value.method },
      signedIn.value.sessionToken,
    );
  });

  app.post("/api/dev/auth/logout", async (c) => {
    const token = readAccountToken(c.req.header("cookie"));
    if (token) {
      const identity = await provider.verifySessionToken(token);
      if (identity.ok) await provider.revokeUserSessions(identity.value.userId);
    }
    const response = okJson(container, { ok: true });
    const headers = new Headers(response.headers);
    headers.append("set-cookie", clearAccountCookie());
    return new Response(response.body, { status: response.status, headers });
  });
}

function superAdminEmails(): readonly string[] {
  const source = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return (source?.env?.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function fail(container: AppContainer, error: AppError): Response {
  return errorResponse(error, container.idGenerator.newId());
}

function okJson(container: AppContainer, body: unknown, status = 200): Response {
  return jsonResponse(body, status, container.idGenerator.newId());
}

function jsonWithSession(container: AppContainer, body: unknown, token: string): Response {
  const response = okJson(container, body);
  const headers = new Headers(response.headers);
  headers.append("set-cookie", accountSessionCookie(token));
  return new Response(response.body, { status: response.status, headers });
}

async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<Result<T, AppError>> {
  let raw: unknown;
  try {
    raw = JSON.parse(await c.req.text()) as unknown;
  } catch {
    return { ok: false, error: createAppError("VALIDATION") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: createAppError("VALIDATION") };
  return { ok: true, value: parsed.data };
}
