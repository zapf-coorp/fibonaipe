# Spec: `adapters-r1-infrastructure` — Postgres persistence, realtime with polling fallback, manual CSV tracker, CSV/JSON exporter, system clock, ids, rate limit, and logger

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `adapters-r1-infrastructure` |
| **Release** | `R1` |
| **Priority** | `M` |
| **Dependencies** | `ports-and-testing-fakes`, `application-room-and-voting` (port usage) |
| **Requirements** | `RF-31`, `RF-63` (base), `RF-64`, `RF-90`, `RNF-01`, `RNF-04`, `RNF-05`, `RNF-12`, `RNF-15`, `RNF-17`, `RNF-19`, `RNF-20`, `RNF-23` |
| **Packages** | `adapter-persistence-postgres`, `adapter-realtime-supabase`, `adapter-issuetracker-manual`, `adapter-exporter-csvjson`, `adapter-system` |

### Perspectives

- **SA:** One adapter per port. Adapters do not import each other. They implement the contracts already tested against fakes.
- **UX:** When the realtime provider is down, the client reports `polling` within 10 seconds and keeps working. CSV downloads open in UTF-8 and do not execute spreadsheet formulas.
- **TA:** Pure-JS `postgres` driver (no `better-sqlite3`, no `node-gyp`) against Supabase or Neon free Postgres. RLS on, no policies for the anonymous database role. The app connects with a server role only from the backend. Free-tier hosting: Cloudflare Workers/Pages, Vercel, or Fly/Render for the API; managed Postgres free tier; cron on the host's free scheduler hitting the purge endpoint.

---

## Functionalities & Core Capabilities

1. **`adapter-persistence-postgres`.** SQL migrations, versioned, forward-only, idempotent re-apply. R1 tables: `rooms`, `participants`, `items`, `rounds`, `votes`, `estimate_audits`, `idempotency_keys`. All timestamps `timestamptz` UTC. `transaction({ lockRoomId })` runs `SELECT ... FOR UPDATE` on the room row and increments `rooms.version` on commit. Rollback does not increment version. Tokens stored as SHA-256 hex only. RLS enabled and no `anon` policies, so the browser cannot query tables with the public key.
2. **`adapter-realtime-supabase`.** Server `RealtimePublisher.publish(roomId, event)`. Browser `RealtimeClient.subscribe` with `onEvent`, `onPresence`, `onStatus`. If the socket fails, status becomes `reconnecting`, then `polling` within 10s. Polling calls `GET /api/rooms/:code/state?since=v` every 2–3s. Heartbeat every 20s while polling. Events with `version > local + 1` or out of order trigger a snapshot fetch. The adapter does not inspect vote secrecy; the application guarantees payloads. A contract test still asserts no fixture event contains a card before reveal.
3. **`adapter-issuetracker-manual`.** `importItems({ kind: 'text' | 'csv', content })`. Text: one item per line, skip blanks, strip leading `-`, `*`, or `1.`. CSV: RFC 4180 quotes, separator `,` or `;` auto-detected, BOM tolerated, headers `title|titulo|título`, `description|descricao|descrição`, `url|link`, `key|id|chave`. Missing title column → `MISSING_TITLE_COLUMN`. Over 500 lines or 1 MB → `LIMIT_EXCEEDED`. Strip control characters.
4. **`adapter-exporter-csvjson`.** Formats `csv` and `json`. CSV is UTF-8 with BOM and comma separator. Cells starting with `=`, `+`, `-`, or `@` are prefixed with a single quote. JSON is pretty-stable key order for snapshot tests.
5. **`adapter-system`.** `Clock` from `Date` (the only place `new Date()` is allowed). `IdGenerator`: ULID for entity ids, CSPRNG room codes from alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` length 8, 256-bit tokens as base64url. SHA-256 for session and host tokens. AES-256-GCM helper for later integration secrets (interface ready, unused by R1 product flows). In-memory or Postgres-backed `RateLimiter` implementing `hit(key, rule)`. JSON logger with `requestId`, `roomId`, `useCase`, `errorCode` and a redaction list: nickname, email, token, card, suit, comment.

---

## Use Cases & Scenarios

### UC-1 — Contract suite against real Postgres

**Given** a disposable Postgres (CI service or local Docker, not a native Node addon), **when** `describePersistenceContract` runs, **then** 100 concurrent increments on one room equal 100, and a thrown error inside the callback leaves version unchanged. Migrating from empty twice does not fail.

### UC-2 — Realtime outage

**Given** the provider client throws, **when** the browser adapter starts, **then** status is `polling` within 10s. **When** the provider returns, **then** status returns to `connected` and missed versions cause one snapshot fetch. No event payload in the fixture set contains `card`.

### UC-3 — CSV import and export safety

**Given** a `;` CSV with accents and a title cell `=cmd|...`, **when** import runs, **then** the title text is kept as data. **When** that title is exported, **then** the cell is prefixed with `'`. A file without a title header returns `MISSING_TITLE_COLUMN`.

### UC-4 — Room codes

**Given** 10 000 generated codes, **then** all match the alphabet and the sample has no collisions (test assertion on the set size).

---

## Interface Contracts (Inputs, Outputs & Error Codes)

Adapters implement the ports from `ports-and-testing-fakes` without widening method meanings.

Persistence errors that are connectivity map to a transport failure the composition root turns into HTTP 503. Domain `AppError`s are not translated inside the adapter; they pass through.

Logger `info/warn/error` accept a structured object. A unit test scans a full create-join-vote-reveal log buffer and fails if it matches nickname, email, token, or a voted card label.

---

## Flow & states

Realtime client status: `connected → reconnecting → polling → connected`.

Migration state: files in `packages/adapter-persistence-postgres/migrations/00N_*.sql` applied in order, recorded in `schema_migrations`.

Rate limiter bucket: key + window start + count. Window expiry resets the count.

---

## Technical design / how-to

1. Add workspace packages with their own `package.json`. Each depends on `@fibonaipe/application` (types only) and its driver. None depends on another adapter.
2. Use the `postgres` npm package (pure JS). Connection string from env `DATABASE_URL`, read only on the server. Pool size small (free tier: max 5, idle timeout short) to survive Neon/Supabase connection limits.
3. RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and do not create policies for `anon` or `authenticated`. The server connection uses a role that bypasses RLS or owns the tables. Document this in the migration comment.
4. Supabase Realtime channel name is `room:{roomId}`. Presence payload is `{ participantId, online }` without votes. If Supabase is not configured, `RealtimeClient` starts in `polling` immediately. That is a valid free-tier mode.
5. Polling interval 2500 ms with jitter. Backoff on HTTP errors up to 10s.
6. CSV parser is a small state machine or a zero-native dependency. Do not add `node-gyp` packages.
7. Wire nothing in React here. Composition root is the next spec's concern, but export factory functions `createPostgresPersistence(env)`, `createRealtime(env)`, etc.
8. Free cron: document a scheduled HTTP call to the purge route with header `x-cron-secret`. The secret is compared in constant time. This spec ships the repository method the use case already calls; the route is in `api-and-room-entry-ui`.

---

## Files to touch

- `packages/adapter-persistence-postgres/migrations/001_r1_rooms.sql`
- `packages/adapter-persistence-postgres/src/postgres-persistence.ts`
- `packages/adapter-persistence-postgres/src/contract.integration.test.ts`
- `packages/adapter-realtime-supabase/src/publisher.ts`
- `packages/adapter-realtime-supabase/src/client.ts`
- `packages/adapter-issuetracker-manual/src/import-items.ts`
- `packages/adapter-issuetracker-manual/src/import-items.test.ts`
- `packages/adapter-exporter-csvjson/src/exporter.ts`
- `packages/adapter-exporter-csvjson/src/exporter.test.ts`
- `packages/adapter-system/src/clock.ts`
- `packages/adapter-system/src/ids.ts`
- `packages/adapter-system/src/rate-limiter.ts`
- `packages/adapter-system/src/logger.ts`
- `packages/adapter-system/src/ids.test.ts`
- `packages/adapter-system/src/logger.test.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Contract factory pointing at Postgres | suite | lock, version, rollback pass |
| Migrations applied twice | second run | success, no duplicate tables |
| Provider down | subscribe | `polling` within 10s |
| CSV `;` + accents | import | correct titles |
| Cell `=1+1` | export CSV | leading `'` |
| 10 000 codes | generate | alphabet only, set size 10 000 |
| Log buffer of a vote flow | scan | no nickname, email, token, or card |
| `better-sqlite3` in any package.json | `npm run verify` | fail |

**QA-red:** contract tests and parser fixtures. **SE-green:** adapters. **QA-verify:** integration job green on free-compatible Postgres; no native addons.
