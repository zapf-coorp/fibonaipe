# Spec: `api-and-room-entry-ui` — Hono HTTP API, guest session, CSRF, rate limits, home, create, join, QR, and reconnection UX

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `api-and-room-entry-ui` |
| **Release** | `R1` |
| **Priority** | `M` |
| **Dependencies** | `web-pwa-shell`, `application-room-and-voting`, `adapters-r1-infrastructure` |
| **Requirements** | `RF-01`, `RF-02`, `RF-20`, `RF-21`, `RF-25`, `RNF-02`, `RNF-06`, `RNF-12`, `RNF-13`, `RNF-22` |
| **App** | `apps/web` routes and `src/server` |

### Perspectives

- **SA:** HTTP is a thin map: validate → use case → `AppError` to status. Authorization stays in `can`, not in the client.
- **UX:** From 360px, keyboard-only, a person can create a room, copy the code, show a QR, and another browser can join. Connection pill shows `Conectado`, `Sincronizando voto...`, or `Reconectando / Acordando servidor...` without blocking the page.
- **TA:** Hono on the Web standard `Request`, so the same routes run on Node, Cloudflare Workers, or Vercel. Cookie `httpOnly`, `Secure`, `SameSite=Lax`. QR is drawn in the browser (no third-party QR host). Composition root in `apps/web/src/server/composition.ts` is the only file that picks concrete adapters.

---

## Functionalities & Core Capabilities

1. **Endpoints.**

| Method and path | Use case |
| :--- | :--- |
| `POST /api/rooms` | `CreateRoom` |
| `POST /api/rooms/:code/join` | `JoinRoom` |
| `GET /api/rooms/:code/state?since=` | `GetRoomSnapshot` |
| `POST /api/rooms/:code/heartbeat` | `Heartbeat` |
| `POST /api/rooms/:code/votes` | `CastVote` |
| `DELETE /api/rooms/:code/votes` | `RetractVote` |
| `POST /api/rooms/:code/reveal` | `RevealRound` |
| `POST /api/rooms/:code/rounds` | `NewRound` |
| `PUT /api/rooms/:code/items/:id/estimate` | `SetFinalEstimate` |
| `POST /api/rooms/:code/items` | `AddItem` |
| `POST /api/rooms/:code/items/import` | `ImportItems` |
| `POST /api/rooms/:code/items/reorder` | `ReorderItems` |
| `POST /api/rooms/:code/items/:id/current` | `SetCurrentItem` |
| `POST /api/rooms/:code/items/:id/skip` | `SkipItem` |
| `POST /api/rooms/:code/items/:id/defer` | `DeferItem` |
| `PATCH /api/rooms/:code/settings` | `UpdateRoomSettings` |
| `POST /api/rooms/:code/host` | `TransferHost` |
| `GET /api/rooms/:code/summary?format=` | `ExportRoomSummary` |
| `POST /api/internal/cron/purge-expired-rooms` | `PurgeExpiredRooms` |

2. **Error body.** `{ error: { code, params } }` with HTTP: `VALIDATION` 400, `NOT_FOUND` and `FORBIDDEN` both 404 for room existence (do not reveal that a code exists when the actor is a stranger — join of a missing code is 404 `NOT_FOUND`; a forbidden action on a known joined room is 403 `FORBIDDEN`), `ROOM_FULL` 409, `RATE_LIMITED` 429 with `retryAfterSec`, `LIMIT_EXCEEDED` 413.
3. **Guest cookie.** On join or create, set `fib_session` to the raw token. Database stores SHA-256. Cookie flags: `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, expiry aligned with the guest room TTL.
4. **Origin check.** Mutating requests require `Origin` equal to the site origin. Mismatch is 403.
5. **Cron route.** Header `x-cron-secret` must match env in constant time. Missing secret is 403. Response is `{ purged: number }`.
6. **Screens.** Home with "Criar sala" and "Entrar com código". Create form: name, which Fibonacci cards, suit axis on/off, auto-reveal, timer, show average. After create: link `/r/:code`, code, copy button, client-generated QR. Join form: code (prefilled from the link), nickname, informational role, mode voter or observer. Errors sit on the field (`NICKNAME_TAKEN`, `ROOM_FULL`, generic not-found).
7. **Reconnection UX.** `ConnectionStatusPill` bound to realtime status. Outbox of pending `clientOpId` commands flushed on `connected`. Reload restores identity via cookie. First slow response shows "Acordando servidor..." for cold starts.
8. **Composition root.** `createContainer(env)` builds clock, ids, postgres, realtime, manual tracker, exporter, rate limiter, logger, and use cases. Tests substitute fakes via `createContainer` options.

---

## Use Cases & Scenarios

### UC-1 — Create and join from a second browser

**Given** the home page at 360×640, **when** the user creates a room and opens the link in a second context, **then** the code is prefilled, a nickname joins, and both see each other in presence after the table spec loads the snapshot. This spec's e2e stops at "both joined and snapshot lists two participants".

### UC-2 — Abuse and CSRF

**Given** 20 bad codes in one minute from one IP, **when** the 21st join hits, **then** 429 and `retryAfterSec`. **Given** a POST with a foreign `Origin`, **then** 403 and the use case is not called. **Given** an invalid body, **then** 400 `VALIDATION`.

### UC-3 — Offline vote queue

**Given** a joined voter, **when** the network is cut for 15s after a vote, **then** reload still shows the same own vote. **When** a vote is attempted offline, **then** the pill says syncing and the vote appears after reconnect without a duplicate.

### UC-4 — Secret purge

**Given** no cron header, **when** the purge route is called, **then** 403. **Given** the right secret and an expired room, **then** `{ purged: 1 }`.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

Request validation (Zod or equivalent) before use cases: nickname 1–30, room name 1–80, code charset of D-09, item title ≤ 200, description ≤ 2000, url http(s) only, `clientOpId` ULID.

Snapshot response before reveal must not contain another participant's `card`, `suit`, or `comment`. A contract test joins two users, A votes, B fetches state, and asserts B's JSON has `hasVoted` for A and no card.

---

## Flow & states

Entry flow: `home → create form → share (link, code, QR) → join form → /r/:code (table shell)`. Join errors stay on the form. Room full replaces the form with a clear message and a link back home.

Connection pill states: `connected`, `syncing`, `reconnecting`, `polling`. Only one pill. It is text plus an icon, not color alone.

Overlays: QR dialog and join form are mutually exclusive. Opening one closes the other.

---

## Technical design / how-to

1. TanStack Router routes: `/`, `/r/$code`, `/r/$code/join`. Data loading via TanStack Query `queryKey: ['room', code, version]`.
2. Mutations use `fetch` to same-origin `/api`. Credentials `include` so the cookie is sent.
3. Hono app exported from `apps/web/src/server/app.ts`. Node listener for local dev; a fetch handler export for Workers/Vercel.
4. Env schema: `DATABASE_URL`, `PUBLIC_ORIGIN`, `CRON_SECRET`, optional `SUPABASE_REALTIME_URL` and key. Missing realtime URL forces polling mode. Never expose service keys to the client bundle. Vite `import.meta.env` only for `VITE_` public flags.
5. QR: small library or a tiny SVG encoder that stays inside the room-entry chunk. Do not call an external image API.
6. i18n keys for every label and error `errors.ROOM_FULL`, etc. No hardcoded Portuguese in components; catalogs live in `pt-BR`.
7. Playwright: 360 and 1280, axe on home and join, two-context join, offline simulation, and the HTTP leak test.
8. Free deploy notes in `docs/limits.md`: which host, cold start behavior, Postgres free limits, cron frequency (every 15 min is enough for a 60 min TTL).

---

## Files to touch

- `apps/web/src/server/app.ts`
- `apps/web/src/server/composition.ts`
- `apps/web/src/server/error-map.ts`
- `apps/web/src/server/routes/rooms.ts`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/r.$code.join.tsx`
- `apps/web/src/features/connection/ConnectionStatusPill.tsx`
- `apps/web/src/features/connection/outbox.ts`
- `apps/web/src/features/share/QrCode.tsx`
- `apps/web/e2e/join.spec.ts`
- `apps/web/e2e/vote-leak.spec.ts`
- `.env.example`
- `docs/limits.md`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Invalid JSON | `POST /api/rooms` | 400 `VALIDATION` |
| Foreign Origin | mutating POST | 403, use case not called |
| 21st code guess in a minute | join | 429 |
| Cookie after join | inspect | `httpOnly`, `Secure`, `SameSite=Lax` |
| B's snapshot while voting | A has voted | no card field for A |
| Link `/r/:code` | open join | code prefilled |
| Duplicate nickname | submit | field error |
| 31st person | join | `ROOM_FULL` copy |
| Offline 15s | reload | identity and vote remain |
| axe on home, both themes | e2e | no serious or critical violations |
| 360 width | home and join | no horizontal scroll |

**QA-red:** HTTP contract tests and one Playwright path. **SE-green:** routes and screens. **QA-verify:** leak test and axe green.
