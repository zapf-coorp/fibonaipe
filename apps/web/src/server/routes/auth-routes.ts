import { CompleteGoogleSignIn, CompleteSignIn, SendMagicLink, type CompleteSignInResult } from "@fibonaipe/application";
import { createAppError, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppContainer } from "../composition.js";
import { dependenciesOf } from "../dependencies.js";
import { clearAccountCookie, readAccountToken } from "../session-cookie.js";
import { sessionUser, issuedSessionToken, superAdminEmails, fail, okJson, jsonWithSession, parseBody, clientIp } from "./http-helpers.js";

const emailSchema = z.object({ email: z.string().trim().min(3).max(320) });
const callbackSchema = z
  .object({
    token: z.string().trim().min(1).max(512).optional(),
    code: z.string().trim().min(1).max(2048).optional(),
  })
  .refine((value) => Boolean(value.token || value.code), { message: "token or code is required" });

/** Where magic links and Google redirects land: the SPA login page. */
function loginRedirectUrl(container: AppContainer): string {
  return `${container.env.PUBLIC_APP_URL}/login`;
}

/** Google returns a one-time `code`; magic links return a `token`. */
function completeCallback(
  body: { readonly token?: string; readonly code?: string },
  container: AppContainer,
): Promise<Result<CompleteSignInResult, AppError>> {
  const deps = dependenciesOf(container);
  if (body.code) {
    return new CompleteGoogleSignIn(deps, container.authProvider).execute({
      code: body.code,
      redirectUrl: loginRedirectUrl(container),
      superAdminEmails: superAdminEmails(),
    });
  }
  return new CompleteSignIn(deps, container.authProvider).execute({
    token: body.token ?? "",
    superAdminEmails: superAdminEmails(),
  });
}

export function registerAuthRoutes(app: Hono, container: AppContainer): void {
  const deps = dependenciesOf(container);

  app.post("/api/auth/magic-link", async (c) => {
    const parsed = await parseBody(c, emailSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const sent = await new SendMagicLink(deps, container.authProvider).execute({
      email: parsed.value.email,
      ip: clientIp(c),
      redirectUrl: loginRedirectUrl(container),
    });
    if (!sent.ok) return fail(container, sent.error);
    return okJson(container, { ok: true });
  });

  app.get("/api/auth/google", () => {
    const url = container.authProvider.getGoogleAuthUrl(crypto.randomUUID(), loginRedirectUrl(container));
    if (!url.ok) return fail(container, url.error);
    return okJson(container, { url: url.value.url });
  });


  app.get("/api/auth/me", async (c) => {
    const user = await sessionUser(c, container);
    if (!user) return okJson(container, { user: null });
    return okJson(container, {
      user: { userId: user.id, email: user.email, displayName: user.displayName },
    });
  });


  app.post("/api/auth/logout", async (c) => {
    const token = readAccountToken(c.req.header("cookie"));
    if (token) {
      const identity = await container.authProvider.verifySessionToken(token);
      if (identity.ok) await container.authProvider.revokeUserSessions(identity.value.userId);
    }
    const response = okJson(container, { ok: true });
    const headers = new Headers(response.headers);
    headers.append("set-cookie", clearAccountCookie());
    return new Response(response.body, { status: response.status, headers });
  });


  app.post("/api/auth/callback", async (c) => {
    const parsed = await parseBody(c, callbackSchema);
    if (!parsed.ok) return fail(container, parsed.error);
    const signedIn = await completeCallback(parsed.value, container);
    if (!signedIn.ok) return fail(container, signedIn.error);
    return jsonWithSession(
      container,
      { userId: signedIn.value.userId, email: signedIn.value.email, isSuperAdmin: signedIn.value.isSuperAdmin },
      signedIn.value.sessionToken || issuedSessionToken(container.authProvider),
    );
  });


  app.get("/api/admin/users", async (c) => {
    const user = await sessionUser(c, container);
    if (!user || user.isSuperAdmin !== true) return fail(container, createAppError("FORBIDDEN"));
    const listed = await container.persistence.transaction({}, async () => ok(user));
    if (!listed.ok) return fail(container, listed.error);
    return okJson(container, { users: [] });
  });

}
