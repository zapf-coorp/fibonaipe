# T5 — Unified Auth HTTP Routes (`/api/auth/google`, `/api/auth/callback`) & `/login` UI

**Status:** TODO  
**Depends on:** T3, T4  
**Max files to touch:** 5 (`apps/web/src/server/session-cookie.ts`, `apps/web/src/server/routes/auth-teams.ts`, `apps/web/src/features/auth/LoginPage.tsx`, `apps/web/src/client/router.tsx`, `apps/web/src/client/i18n/locales/pt-BR.json`)

## Goal

Expose the complete email + Google authentication HTTP flow and provide a unified `/login` route that works in both Production (real Email Magic Link + Google OAuth redirect) and Local Dev (also shows the 1-click Dev Fake simulator for Email and Google).

## Step-by-Step Instructions

### 1. Conditional `Secure` Flag in `apps/web/src/server/session-cookie.ts`

Browsers on `http://localhost` may reject cookies with `Secure` in some WebViews or HTTP prod previews. Keep `Secure` by default, or allow `cookieLine` to stay `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}` (Chromium treats `localhost` as a secure context, so check if existing unit tests assert the exact string `HttpOnly; Secure; SameSite=Lax`).
- **Important:** Check `apps/web/test` for assertions on `set-cookie`. If tests expect `HttpOnly; Secure; SameSite=Lax`, preserve that exact format!

### 2. Add Google OAuth Route and Code Exchange in `apps/web/src/server/routes/auth-teams.ts`

1. Add `GET /api/auth/google`:
   ```ts
   app.get("/api/auth/google", (c) => {
     const state = container.idGenerator.newId();
     const redirectUrl = `${container.env.PUBLIC_APP_URL}/login`;
     const result = container.authProvider.getGoogleAuthUrl(state, redirectUrl);
     if (!result.ok) return fail(container, result.error);
     return okJson(container, { url: result.value.url, state });
   });
   ```
2. Update `POST /api/auth/callback` schema and handler to accept either `{ token }` (Magic Link / access_token) or `{ code }` (Google OAuth code):
   ```ts
   const callbackSchema = z.object({
     token: z.string().trim().min(1).max(2048).optional(),
     code: z.string().trim().min(1).max(2048).optional(),
   });
   ```
   - If `parsed.value.code` is provided, execute `new CompleteGoogleSignIn(deps, container.authProvider).execute({ code: parsed.value.code, redirectUrl: `${container.env.PUBLIC_APP_URL}/login`, superAdminEmails: superAdminEmails() })`.
   - Else if `parsed.value.token` is provided, execute `new CompleteSignIn(deps, container.authProvider).execute({ token: parsed.value.token, superAdminEmails: superAdminEmails() })`.
   - Else return `fail(container, createAppError("VALIDATION"))`.
3. Update `sendMagicLink` redirectUrl in `POST /api/auth/magic-link` to `${container.env.PUBLIC_APP_URL}/login` (or keep `/api/auth/callback` if required by existing tests — check existing tests in `apps/web/test` first; if a test checks `redirectUrl`, keep `/api/auth/callback` as default and allow optional `redirectUrl` or handle both).

### 3. Create `apps/web/src/features/auth/LoginPage.tsx` and Register `/login` in `apps/web/src/client/router.tsx`

1. In `apps/web/src/client/i18n/locales/pt-BR.json`, add keys under `"auth"` (remember: **only** edit `pt-BR.json`, never `en-US.json` or `es-ES.json`!):
   - `auth.title`, `auth.subtitle`, `auth.emailLabel`, `auth.sendMagicLink`, `auth.magicLinkSent`, `auth.googleButton`, `auth.error`, `auth.devSimulatorHeading`.
2. In `apps/web/src/features/auth/LoginPage.tsx`:
   - On mount, inspect `window.location.search` and `window.location.hash` for `token`, `access_token`, or `code`. If present, `POST /api/auth/callback` with `{ token }` or `{ code }` and redirect to `/teams` on success.
   - Render an Email form (`POST /api/auth/magic-link` with `{ email }`) showing a confirmation state when sent.
   - Render a "Continue with Google" button that calls `GET /api/auth/google` and navigates to `data.url`.
   - Render `<DevLoginPage />` below (or when `/api/dev/auth/status` is enabled) so in local development the user can sign in with 1 click as Host, Alice, Bruno, or Carla using simulated Email or Google.
3. In `apps/web/src/client/router.tsx`, add `/login` route pointing to `LoginPage` (keep `/dev/login` working as well so no existing test breaks).

## Verification

Run:
```sh
npm run lint
npm run typecheck
npm run check:i18n
npx vitest run
```
