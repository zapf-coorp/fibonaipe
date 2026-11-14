# Spec: Operations, quality and security

Requirements: RNF-02, RNF-12 to RNF-15, RNF-18 to RNF-20, RNF-23, RNF-25, RNF-26.

## The gate: `npm run verify`

Run from the repository root with Node 24 and npm 10 or later. Every task and release must pass with zero errors.

| Step | Command | Enforces |
| :--- | :--- | :--- |
| 1. Lint | `npm run lint` | Zero warnings; no `any`; no `Date.now()` or `Math.random()` in `domain` or `application`. |
| 2. Typecheck | `npm run typecheck` | Strict TypeScript across all workspaces. |
| 3. Boundaries | `npm run check:boundaries` | `domain` has zero runtime deps, `application` imports only `domain`, no adapter imports another adapter. Negative fixtures in `tools/boundary-fixtures` must fail. |
| 4. i18n | `npm run check:i18n` | Every `t('...')` key exists in `pt-BR.json`, no orphan keys, no hardcoded JSX strings. |
| 5. Licenses | `npm run check:licenses` | All production dependencies are permissive. |
| 6. Unit, property, contract | `npm run test:unit` | Vitest with coverage of at least 90% lines in `domain` and `application`; `fast-check` properties; every `describe*Contract` suite. |
| 7. Build | `npm run build` | `tsc -b` of all packages and the web build. |
| 8. Bundle budget | `npm run check:bundle` | Room route initial JS at most 150 KB gzip (`BUNDLE_BUDGET_ROOM_GZIP_BYTES` = 153600). |
| 9. E2E and axe | `npm run test:e2e` | Playwright with `@axe-core/playwright` at 360×640, 1280×720 and 1920×1080, light and dark, no serious or critical violations. |

Test layers: unit and contract tests run against `InMemoryPersistence` and fakes; contract suites also run against the real adapters (SQLite locally; live Postgres cases skip when `DATABASE_URL` is unset). Property tests cover stats (`min ≤ median ≤ max`, permutation invariance, specials excluded from numeric averages) and the vote non-leakage property.

## Run locally

```sh
npm ci
npm run dev --workspace=@fibonaipe/web -- --strictPort
```

Open `http://localhost:5173`. Vite serves the UI and the API at the same address. The dev gateway uses `PERSISTENCE_DRIVER=sqlite` with the file `data/local.sqlite` (created on first run), so rooms survive a restart. Tests use `:memory:`. No credentials are needed. The server reads only process environment variables; it does not load a `.env` file.

### Production build and start

```sh
npm ci
npm run build
npm start
```

`npm run build` runs `tsc -b`, the Vite client build (`apps/web/dist/client`) and a server bundle (`apps/web/dist/server/main.js`, produced by `vite build --ssr`). `npm start` runs that bundle. Set `NODE_ENV=production`, `PORT`, `PUBLIC_APP_URL`, `PERSISTENCE_DRIVER=postgres` with `DATABASE_URL`, and the Supabase variables. On startup the server applies pending Postgres migrations, serves `/healthz` and `/api/*`, and serves the client with an SPA fallback for client routes such as `/r/:code`, `/teams` and `/login`.

To test a room with several users on one machine, use separate cookie contexts, because `fib_session` is shared by tabs of the same browser profile (including private windows of that profile). For example: a normal Chrome window, an incognito Chrome window and an Edge InPrivate window, all on `localhost:5173`. Create the room in the first, copy the invite link, join from the others, vote in each, and confirm that others show only "voted" until reveal.

## Environment variables

Validated at server start in `apps/web/src/server/env.ts` with Zod. `.env.example` is the template; copy it to `.env`, never commit `.env`, and never expose server secrets to the browser (no `VITE_` prefix).

| Variable | Purpose |
| :--- | :--- |
| `NODE_ENV` | `development`, `test` or `production`. |
| `PORT` | Server port (template: 8787). |
| `PUBLIC_APP_URL` | Public origin. Mutating requests must send this exact `Origin`; also used for magic-link redirects. |
| `DATABASE_URL` | Postgres connection string (server only, Supabase or Neon free). |
| `SESSION_SECRET` | Server secret for session handling (`AUTH_SECRET` is accepted as an alias). Opaque tokens are stored as SHA-256. Generate with Node crypto. |
| `PERSISTENCE_DRIVER` | `in-memory` (default), `sqlite` (dev gateway, file `data/local.sqlite`) or `postgres` (requires `DATABASE_URL`). |
| `CRON_SECRET` | Value of the `x-cron-secret` header for `POST /api/internal/cron/purge-expired-rooms`. |
| `INTEGRATION_KEY` | 32 raw bytes, base64. AES-256-GCM key for ClickUp and Jira tokens at rest. |
| `SUPERADMIN_EMAILS` | Comma-separated emails granted SuperAdmin, lowercased at login. |
| `AUTH_DRIVER` | `dev-fake` (default under Vite, so `/dev/login` works without Supabase) `supabase` (production auth, needs `SUPABASE_URL` and keys) or `unavailable`. `dev-fake` is ignored when `NODE_ENV=production`. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_REALTIME_URL` | Auth and realtime provider (R2). Leave empty until configured. If realtime is unset the client uses HTTP polling. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth. |

`domain` and `application` never read `process.env` or `import.meta.env`.

## Security checklist

- **Vote secrecy on the wire.** `vote.changed` carries only `{ participantId, hasVoted }`; `projectRoomForViewer` strips other participants' values while voting; guarded by a property test.
- **Hashed guest tokens.** 256-bit tokens from `node:crypto`, sent in an `httpOnly; Secure; SameSite=Lax; Path=/` cookie; only `SHA-256(token)` is stored.
- **Room codes.** 8 characters drawn uniformly from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 characters, no `0/O/1/I/L`).
- **CSV injection** protection and UTF-8 BOM in the exporter.
- **Credential encryption** with AES-256-GCM for tracker tokens.
- **Zero PII and zero votes in logs.** JSON logs allow only `{ timestamp, level, requestId, roomId, useCase, errorCode, durationMs }`, plus a numeric `count` for purge. Tests assert nicknames, emails, tokens and cards never appear.
- **RLS** enabled with no anon policies; all data access is server-side.
- **Rate limits** per IP and per participant (see limits in the [NFR PRD](../prd/non-functional-requirements.md#operational-limits-and-default-parameters)).

## Deployment and free-tier limits

Everything runs at $0 within free tiers, and stays portable through the ports.

```text
Browser PWA (React, TanStack, Service Worker)
   │ HTTPS REST + static assets (+ polling fallback on /state)        │ WSS events and presence
   ▼                                                                   ▼
Cloudflare Pages/Workers or Vercel (static assets, Hono API,     Supabase Realtime (broadcast, presence)
composition root) ──► Supabase or Neon Postgres (row lock, AES-GCM tokens)
Cron (GitHub Actions or platform) ──► purge-expired-rooms, DB backup export
```

- **Cold starts.** If the API or database takes more than 1.5 s to answer, the UI shows the non-blocking `ConnectionStatusPill` ("Reconectando / Acordando servidor...") and keeps the local vote selection in the `clientOpId` queue.
- **Quotas.** Confirm current quotas before deploy and alert around 80% of each.

| Service | Watch |
| :--- | :--- |
| Managed Postgres (Supabase or Neon) | Storage, connection count, compute hours. Keep the pool small. |
| Realtime | Concurrent connections. HTTP polling every 2–3 s is the fallback. |
| Static or serverless host | Bandwidth and invocation count. Cold starts must show a reconnecting message. |
| Cron | One purge call every 15 minutes is enough for the 60-minute guest-room TTL. |

- **Native addons** (`better-sqlite3`, `bcrypt`, `sharp`, `canvas`) are not allowed.

## Observability

Structured JSON logs and aggregate health metrics with no PII or votes (RNF-19). The `ErrorReporter` port receives unexpected defects. Health is `GET /healthz`.

## Knowledge graph

`graphify-out/` holds a generated knowledge graph. Query it by feature symbol (`TasksModal`, `QueueDrawer`) with `graphify query`, `graphify path` or `graphify explain`; `AppError` and `Result` are hubs on purpose and a poor starting point. After modifying code run `graphify update .`.
