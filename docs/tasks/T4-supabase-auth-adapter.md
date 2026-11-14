# T4 — Create `@fibonaipe/adapter-auth-supabase` (Production Email & Google Auth)

**Status:** DONE  
**Depends on:** T3  
**Max files to touch:** 6 (`packages/adapter-auth-supabase/*`, `apps/web/package.json`, `apps/web/src/server/composition.ts`, `tsconfig.json`)

## Goal

Create the production `AuthProvider` adapter package `@fibonaipe/adapter-auth-supabase` using native `fetch` against Supabase GoTrue REST endpoints (`/auth/v1/*`). Zero heavy SDKs, zero native addons, full constructor/factory pattern, and unit tests with injected `fetch`.

## Step-by-Step Instructions

### 1. Create `packages/adapter-auth-supabase/package.json` and `tsconfig.json`

`packages/adapter-auth-supabase/package.json`:
```json
{
  "name": "@fibonaipe/adapter-auth-supabase",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@fibonaipe/application": "*",
    "@fibonaipe/domain": "*"
  }
}
```

`packages/adapter-auth-supabase/tsconfig.json`: copy structure from `packages/adapter-auth-devfake/tsconfig.json` (referencing `../domain` and `../application`), and add `{ "path": "./packages/adapter-auth-supabase" }` to root `tsconfig.json`.

### 2. Implement `packages/adapter-auth-supabase/src/supabase-auth-provider.ts`

```ts
import { UserId, createAppError, err, ok, type AppError, type Result, type UserId as UserIdValue } from "@fibonaipe/domain";
import type { AuthProvider, AuthenticatedIdentity } from "@fibonaipe/application";

export interface SupabaseAuthOptions {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey?: string;
  readonly fetchImpl?: typeof fetch;
}
```

Behavior of `SupabaseAuthProvider implements AuthProvider`:
- **Constructor**: receives `SupabaseAuthOptions`, trims trailing `/` from `supabaseUrl`, defaults `fetchImpl` to `globalThis.fetch`.
- **`sendMagicLink(email, redirectUrl)`**:
  - Validates email format (non-empty, contains `@` and domain `.`; otherwise `err(createAppError("VALIDATION"))`).
  - `POST ${baseUrl}/auth/v1/otp` with headers `{ apikey: anonKey, "content-type": "application/json" }` and body `JSON.stringify({ email: normalizedEmail, create_user: true, options: { emailRedirectTo: redirectUrl } })`.
  - If response is not `ok`, return `err(createAppError("AUTH_LINK_INVALID"))`.
  - Return `ok({ challengeId: normalizedEmail })`.
- **`verifyMagicLink(token)`**:
  - Supports two token formats used by Supabase redirects:
    1. If `token` starts with `otp:` (`otp:<email>:<token_hash>` or `<token_hash>`), call `POST ${baseUrl}/auth/v1/verify` with `{ type: "magiclink", token_hash }`.
    2. Otherwise treat `token` as an `access_token` (or try `/auth/v1/verify` with `{ type: "magiclink", token_hash: token }` first, and if that fails, call `verifySessionToken(token)`).
  - Extracts `{ access_token, user }` and maps to `AuthenticatedIdentity` with `sessionToken: access_token ?? token`.
- **`getGoogleAuthUrl(state, redirectUrl)`**:
  - Builds `${baseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`.
  - Returns `ok({ url })`.
- **`exchangeGoogleCode(code, _redirectUrl)`**:
  - If `code` is already a bearer `access_token` (from implicit/hash redirect), delegates to `verifySessionToken(code)`.
  - Otherwise `POST ${baseUrl}/auth/v1/token?grant_type=pkce` with `{ auth_code: code }` (and fallback to `verifySessionToken(code)` if needed).
  - Returns `ok(identity)` with `sessionToken`.
- **`verifySessionToken(token)`**:
  - `GET ${baseUrl}/auth/v1/user` with headers `{ apikey: anonKey, Authorization: \`Bearer ${token}\` }`.
  - If status !== 200, return `err(createAppError("AUTH_LINK_INVALID"))`.
  - Parse `{ id, email, user_metadata, banned_until }`. If `banned_until` is in the future, return `err(createAppError("ACCOUNT_SUSPENDED"))`.
  - Map `UserId.create(id)`, `email`, `displayName: user_metadata?.full_name ?? user_metadata?.name ?? email.split("@")[0]`, `emailVerifiedAt: new Date(0)`, `sessionToken: token`.
- **`revokeUserSessions(userId)`**:
  - If `serviceRoleKey` is present, `POST ${baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout` with `{ apikey: serviceRoleKey, Authorization: \`Bearer ${serviceRoleKey}\` }`.
  - Return `ok(undefined)`.

Export `SupabaseAuthProvider`, `createSupabaseAuthProvider`, and `SupabaseAuthOptions` from `packages/adapter-auth-supabase/src/index.ts`.

### 3. Wire into `apps/web/src/server/composition.ts` and `apps/web/package.json`

1. Add `"@fibonaipe/adapter-auth-supabase": "*"` to `apps/web/package.json` dependencies.
2. In `apps/web/src/server/composition.ts`, update `authProviderFor`:
   ```ts
   function authProviderFor(env: ServerEnv, clock: Clock, idGenerator: IdGenerator): AuthProvider {
     const driver = env.AUTH_DRIVER ?? (env.NODE_ENV === "development" ? "dev-fake" : env.SUPABASE_URL ? "supabase" : "unavailable");
     if (env.NODE_ENV !== "production" && driver === "dev-fake") {
       return createDevFakeAuthProvider({ clock, ids: idGenerator });
     }
     if (driver === "supabase" && env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
       return createSupabaseAuthProvider({
         supabaseUrl: env.SUPABASE_URL,
         anonKey: env.SUPABASE_ANON_KEY,
         serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
       });
     }
     return unavailableAuth();
   }
   ```

### 4. Write Unit Tests

Create `packages/adapter-auth-supabase/src/supabase-auth-provider.test.ts` testing:
- `sendMagicLink` valid and invalid email
- `getGoogleAuthUrl` URL construction
- `verifyMagicLink` and `verifySessionToken` with mocked `fetchImpl`
- `revokeUserSessions` calling admin logout

## Verification

Run:
```sh
npm run lint
npm run typecheck
npm run check:boundaries
npx vitest run packages/adapter-auth-supabase
```
