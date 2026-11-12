# Execution Tasks for Smaller LLMs (Production, Auth, Persistence & Clean Code)

This folder contains self-contained, small-scope tasks designed so smaller LLMs can execute one task at a time with zero ambiguity.

## Golden Rules for Every Agent Executing a Task

1. **Hexagonal Dependency Rule:** `packages/domain` ← `packages/application` ← `packages/adapter-*` ← `apps/web`.
   - `packages/domain` has zero runtime dependencies and must never call `Date.now()`, `new Date()` (without arguments), `Math.random()`, or `process.env`.
   - `packages/application` imports only `@fibonaipe/domain`.
   - An `adapter-*` package never imports another `adapter-*` package.
   - `apps/web/src/server/composition.ts` is the only file that wires concrete adapters.
2. **Constructor + Adapter + Result Pattern:**
   - Use cases receive dependencies (`UseCaseDependencies`, `AuthProvider`, etc.) via `constructor(...)`.
   - Expected errors return `Result<T, AppError>` (`ok(...)` / `err(createAppError(...))`), never throwing exceptions.
3. **Zero Native Addons:** Never install `better-sqlite3`, `bcrypt`, `sharp`, `canvas`, or any `node-gyp` package.
4. **i18n Rule:** New UI copy goes **only** in `apps/web/src/client/i18n/locales/pt-BR.json`. Do not edit `en-US.json` or `es-ES.json`.
5. **Verification per Task:** Run `npm run lint && npm run typecheck && npm run check:boundaries` and the relevant `vitest` suite after each task.

## Task Index & Progress Log

| Task | Status | Scope | File |
| :--- | :---: | :--- | :--- |
| **T1** | **DONE** | Explicit `planning` snapshot in `PersistedRoomRecord` + Postgres `007_room_planning_json.sql` + contract test | [T1-postgres-planning.md](T1-postgres-planning.md) |
| **T2** | **TODO** | Disk SQLite (`data/local.sqlite`) in local dev, `:memory:` in tests, and `.env` loading in `env.ts` / `composition.ts` | [T2-dev-sqlite-and-env.md](T2-dev-sqlite-and-env.md) |
| **T3** | **TODO** | Explicit `sessionToken` on `AuthProvider` and `CompleteSignIn` (remove `latestSessionToken` hack) | [T3-auth-contract-session-token.md](T3-auth-contract-session-token.md) |
| **T4** | **TODO** | Create `@fibonaipe/adapter-auth-supabase` (Email Magic Link + Google OAuth via GoTrue REST `fetch`) | [T4-supabase-auth-adapter.md](T4-supabase-auth-adapter.md) |
| **T5** | **TODO** | Unified Auth HTTP routes (`/api/auth/google`, `/api/auth/callback`), conditional `Secure` cookie, and `/login` UI (Prod + Dev simulator) | [T5-auth-routes-and-login-ui.md](T5-auth-routes-and-login-ui.md) |
| **T6** | **TODO** | Data linking & Room Claiming (`POST /api/rooms/:code/claim`, `POST /api/rooms/:code/link-account`, authenticated join & UI triggers) | [T6-data-linking-and-room-claim.md](T6-data-linking-and-room-claim.md) |
| **T7** | **TODO** | Clean Code modularization of the 4 largest files (`auth-teams.ts`, `room-session.ts`, `sqlite-persistence.ts`, `postgres-persistence.ts`) | [T7-cleancode-modularization.md](T7-cleancode-modularization.md) |
| **T8** | **TODO** | Production Node/Hono server entrypoint (`apps/web/src/server/main.ts`), static SPA serving, auto-migrations & `npm start` | [T8-production-server-entrypoint.md](T8-production-server-entrypoint.md) |
| **T9** | **TODO** | Final documentation sync, full `npm run verify` gate, and `graphify update .` | [T9-docs-and-final-verify.md](T9-docs-and-final-verify.md) |
