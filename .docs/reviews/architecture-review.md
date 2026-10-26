# Architecture & Stack Review — Fibonaipe (v1.0)

**Review Target:** `.docs/requirements.md`, `.docs/technologies.md`, `.docs/host.json`  
**Reviewer Role:** Technology Architect (`ta-analyze-core`)  
**Date:** 2026-10-26  
**Verdict:** **`PASS`**

---

## 1. Executive Verdict (`PASS`)

The technical blueprint in `.docs/technologies.md` is in **100% alignment** with the functional, mathematical, non-functional, and UX/Juice requirements defined in `.docs/requirements.md` and the host constraints probed in `.docs/host.json`.

### Core Verification Checklist

| Verification Pillar | Requirement / Constraint Reference | Architecture Implementation (`.docs/technologies.md`) | Status |
| :--- | :--- | :--- | :---: |
| **Host Compatibility & Zero C++ Addons** | `.docs/host.json` (`win32/x64`, `Node v24.12.0`, `hasNodeSqlite: true`, `nativeCompileLikelyOk: false`) | Strictly bans `node-gyp` / C++ native addons (`better-sqlite3`, `bcrypt`, `sharp`, `canvas`). Uses pure-JS `postgres` (`postgres.js`) for production PostgreSQL, `InMemoryPersistence` for unit/contract suites, and built-in `node:sqlite` (`DatabaseSync`) if local SQLite inspection is needed (`§1.5`, `§10.3`). | **PASS** |
| **Pure `npm workspaces`** | `§2.11`, `RNF-24` | Root `package.json` with `npm workspaces` and a single root `package-lock.json`; `pnpm` and `yarn` are explicitly prohibited (`§1.4`, `ADR-01`). | **PASS** |
| **Frontend Stack (React + TanStack + Vite)** | `§2.11`, `RNF-02`, `RNF-06`, `RNF-22` | React 19 + TanStack Router + TanStack Query v5 + Vite 6 + `vite-plugin-pwa` + CSS Modules & Design Tokens (`§2 Layer 1`, `ADR-02`, `ADR-06`), enforcing the `≤ 150 KB` gzipped room bundle budget (`tools/check-bundle-budget.mjs`). | **PASS** |
| **Hexagonal Boundaries (Ports & Adapters)** | `§2.11`, `§8.1`, `RNF-16`, `RNF-17` | Strict inward dependency flow: `packages/domain` (0 runtime deps) $\leftarrow$ `packages/application` (depends only on `domain`) $\leftarrow$ `packages/adapter-*` (isolated per port) $\leftarrow$ `apps/web` (`composition.ts`). Enforced via `eslint.config.js` and `tools/check-boundaries.mjs` (`§1.1`, `§4`, `§11.3`). | **PASS** |
| **Builder & `Result<T, AppError>` Patterns** | `§2.11`, `INV-01`..`INV-14` | Private constructors on aggregates (`Room`, `RoomSettings`, `Scale`, `Sprint`, `ForecastReport`) with fluent Builders returning `Result<Entity, AppError>` (`§1.2`, `§1.3`, `§5.1`, `§5.2`). | **PASS** |
| **Persistence & Privacy Strategy** | `§2.7`, `§2.8`, `RF-60`, `RF-61`, `INV-13`, `RNF-23` | `Persistence` Port with room-level transactional serialization (`SELECT ... FOR UPDATE` + `Room.version` increment). `history_entries` stores strictly aggregated round stats (`rounds_summary` JSONB) and never individual votes or comments (`§6.1`, `§6.2`). | **PASS** |
| **Authentication & Session Security** | `RF-01`..`RF-05`, `RNF-12`, `RNF-13` | `AuthProvider` Port backed by Supabase Auth (Magic Link + Google OAuth) for R2, plus `httpOnly; Secure; SameSite=Lax` guest session cookies storing only `SHA-256(token)` in PostgreSQL (`§2 Layer 3`, `§6.1`, `§11.2`). | **PASS** |
| **Realtime & Vote Non-Leakage** | `§8.2`, `RF-40`, `RF-42`, `RNF-01`, `RNF-05`, `RNF-13` | `RealtimePublisher` / `RealtimeClient` Ports over Supabase Realtime WebSocket with automatic `2–3s` HTTP polling fallback (`GET /api/rooms/:code/state?since=v`). `EVT-08 (vote.changed)` emits only `{ participantId, hasVoted }`; `projectRoomForViewer` strips unrevealed card/suit values (`§5.3`, `§11.2`). | **PASS** |

---

## 2. Requirements-to-Architecture Coverage Matrix

### 2.1 Functional Requirements (`RF-01` to `RF-96`)

| Req ID | Summary | Release | Architecture & Component Mapping in `.docs/technologies.md` | Status |
| :--- | :--- | :---: | :--- | :---: |
| **RF-01** | Quick Guest Join (nickname, role, Voter/Observer, link/8-char code/QR) | R1 | `JoinRoom` use case (`§4`), `Participant` entity (`INV-14`), `IdGenerator.newRoomCode()` (`§11.2`), client-side `qrcode` SVG (`§2 Layer 1`), `POST /api/rooms/:code/join` (`§7.2`). | **COVERED** |
| **RF-02** | Transparent Reconnection via secure session cookie | R1 | `ReconnectParticipant` use case (`§4`), `httpOnly` cookie with `guest_token_hash` (`SHA-256`) in `PARTICIPANTS` (`§6.1`, `§11.2`). | **COVERED** |
| **RF-03** | Passwordless (Magic Link) & Google OAuth login | R2 | `AuthProvider` port (`packages/application/src/ports/auth-provider.port.ts`), `@fibonaipe/adapter-auth-supabase`, `/api/auth/*` routes (`§7.2`). | **COVERED** |
| **RF-04** | Active Ephemeral Room Claiming | R2 | `ClaimRoom` use case (`packages/application/src/use-cases/auth-teams`), `POST /api/rooms/:code/claim` (`§7.2`). | **COVERED** |
| **RF-05** | Self-Service Account Deletion (LGPD) preserving team history | R2 | `DeleteAccount` use case (`§4`), `DELETE /api/me` (`§7.2`), nullable `user_id` in `PARTICIPANTS` & user-decoupled `HISTORY_ENTRIES` (`§6.1`). | **COVERED** |
| **RF-10** | Team Creation & 7-day Revocable Invite Links | R2 | `CreateTeam`, `ManageInvites` use cases (`§4`), `TEAMS` & `INVITES` tables (`§6.1`), `POST /api/teams`, `POST /api/teams/:id/invites` (`§7.2`). | **COVERED** |
| **RF-11** | Team RBAC (`can` matrix) & `LAST_ADMIN` protection | R2 | `packages/domain/src/policy/can.ts`, `team.ts` (`LAST_ADMIN` error code in `§5.1`), `ChangeMemberRole` use case (`§4`). | **COVERED** |
| **RF-12** | Multi-Team Membership per User | R2 | `USERS ||--o{ MEMBERSHIPS` & `TEAMS ||--o{ MEMBERSHIPS` join table (`§6.1`). | **COVERED** |
| **RF-13** | SuperAdmin Instance Panel (`/admin`) without vote access | R2 | `/admin` route in TanStack Router (`§4`), `GET /api/admin/overview`, `PATCH /api/admin/users/:id/status` (`§7.2`), `SUPERADMIN_EMAILS` env var (`§9`). | **COVERED** |
| **RF-14** | Multi-Organization Data Model (`Organization` $\rightarrow$ `Team`) | R2 | `ORGANIZATIONS ||--o{ TEAMS` in ER schema (`§6.1`) and `packages/domain/src/entities/team.ts` (`§4`). | **COVERED** |
| **RF-20** | Room Creation (Fibonacci subset, suits config, rules, guest/auth) | R1 | `RoomBuilder` & `RoomSettingsBuilder` (`§5.2`), `CreateRoom` use case, `POST /api/rooms` (`§7.2`). | **COVERED** |
| **RF-21** | Easy Sharing (`/r/:code`, 8-char unambiguous code, local QR) | R1 | CSPRNG 31-char alphabet (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`, `§11.2`), TanStack route `/r/$code`, client `qrcode` SVG (`§2 Layer 1`). | **COVERED** |
| **RF-22** | Realtime Presence & Vote Status (`online`/`offline`, `hasVoted`) | R1 | `RealtimePublisher` / `RealtimeClient` ports, `Heartbeat` use case, `SeatBadge` component (`§4`), `EVT-08` (`§5.3`). | **COVERED** |
| **RF-23** | Host Transfer (Manual, Delegated Facilitator, 60s Auto-Transfer) | R1 | `room.ts` host transfer logic (`§4`), `TransferHost` use case, `POST /api/rooms/:code/host` (`§7.2`). | **COVERED** |
| **RF-24** | Dynamic Room Settings (active cards, suit axis, auto-reveal, timer, mean) | R1 | `RoomSettingsBuilder` (`§5.2`), `PATCH /api/rooms/:code/settings` (`§7.2`), `rooms.settings` JSONB (`§6.1`). | **COVERED** |
| **RF-25** | 30-Participant Room Capacity Limit (`ROOM_FULL`) | R1 | `MAX_PARTICIPANTS = 30` in `constants.ts` (`§4`), `ROOM_FULL` (`409 Conflict` in `§5.1`, `§7.1`). | **COVERED** |
| **RF-26** | Persistent Team Rooms vs. 60-min Ephemeral Guest Rooms | R2 | `rooms.kind` (`guest \| team`), `rooms.expires_at` (`§6.1`), `PurgeExpiredRooms` cron use case (`§4`, `§7.2`). | **COVERED** |
| **RF-27** | Screen / Projector Mode (`/r/:code/screen`, read-only, $\ge 48\text{px}$, no seat) | R1 | `/r/$code/screen` route (`§4`), `GET /api/rooms/:code/state?since=v&mode=screen` (`§7.2`), `1920x1080` Playwright E2E target (`§11.3`). | **COVERED** |
| **RF-30** | Manual Item Addition (title $\le 200$, desc $\le 2000$, URL, `A/K/Q/J` tag) | R1 | `AddItem` use case, `ITEMS` schema (`title`, `description`, `external_url`, `figure_tag`, `§6.1`), `POST /api/rooms/:code/items` (`§7.2`). | **COVERED** |
| **RF-31** | Batch Import (Free-text & CSV up to 500 items with preview) | R1 | `@fibonaipe/adapter-issuetracker-manual`, `CsvImportModal` (`§4`), `POST /api/rooms/:code/items/import` (`§7.2`). | **COVERED** |
| **RF-32** | Queue Reordering (Drag-and-Drop + Keyboard controls) | R1 | `ReorderItems` use case, `ItemQueue` component (`§4`), `POST /api/rooms/:code/items/reorder` (`§7.2`). | **COVERED** |
| **RF-33** | Skip, Defer, and Reopen Items preserving prior rounds | R1 | `SetCurrentItem`, `SkipItem`, `DeferItem` use cases (`§4`), `ITEMS.status` & `ROUNDS` relation (`§6.1`). | **COVERED** |
| **RF-40** | Secret Ballot Network Security (never sent before reveal) | R1 | `projectRoomForViewer` (`packages/application/src/projections/room-view.ts`), `EVT-08` payload restriction (`§5.3`), `fast-check` non-leakage property test (`§11.2`). | **COVERED** |
| **RF-41** | Change or Retract Vote while `Round.status === 'voting'` | R1 | `CastVote`, `RetractVote` use cases (`§4`, `§5.3`), `POST` & `DELETE /api/rooms/:code/votes` (`§7.2`). | **COVERED** |
| **RF-42** | Vote Cast Indicator (`hasVoted = true`) without card value | R1 | `EVT-08 vote.changed` (`{ participantId, hasVoted: true }`, `§5.3`), `SeatBadge` (`§4`). | **COVERED** |
| **RF-43** | Manual & Automatic Card Reveal (all online non-AFK voters voted) | R1 | `RevealRound` use case & auto-reveal check inside `room.castVote` (`§4`, `§5.3`), `POST /api/rooms/:code/reveal` (`§7.2`). | **COVERED** |
| **RF-44** | Complete Round Statistics (mean, median, modes, min, max, consensus, near-consensus) | R1 | `packages/domain/src/math/round-stats.ts` (`computeRoundStats`), `rounds.aggregated_stats` JSONB (`§6.1`). | **COVERED** |
| **RF-45** | Multiple Rounds per Item (`Round n+1`) preserving prior round stats | R1 | `NewRound` use case (`§4`), `ITEMS ||--o{ ROUNDS` (`round_number`, `aggregated_stats`, `§6.1`), `POST /api/rooms/:code/rounds` (`§7.2`). | **COVERED** |
| **RF-46** | Final Estimate Selection by Host/Facilitator | R1 | `SetFinalEstimate` use case (`§4`), `PUT /api/rooms/:code/items/:id/estimate` (`§7.2`). | **COVERED** |
| **RF-47** | Special Cards (`?`, `Coringa`, `AFK`) excluded from numeric math | R1 | `packages/domain/src/scales/card.ts`, `round-stats.ts` (`specialCounts`), `PARTICIPANTS.mode` (`voter \| observer \| afk`, `§6.1`). | **COVERED** |
| **RF-48** | Customizable Fibonacci Scale per Room/Team | R1 | `Scale` & `ScaleBuilder` (`packages/domain/src/scales/scale-builder.ts`), `RoomSettingsBuilder.withActiveCards` (`§5.2`). | **COVERED** |
| **RF-49** | Server-Synchronized Round Timer (`serverTime`, non-blocking alert) | R1 | `Clock.now()`, `rounds.timer_ends_at` (`§6.1`), `RoundTimer` component (`§4`). | **COVERED** |
| **RF-50** | Ephemeral Short Vote Justification ($\le 140$ chars, never in history) | R3 | `votes.short_comment` (ephemeral table, `§6.1`), excluded from `history_entries` (`§6.2`). | **COVERED** |
| **RF-51** | Single-Tap Suit Selection (defaults to `Coringa` if omitted) | R1 | `SuitSelector` component (`§4`), `input.suit ?? 'joker'` in `CastVoteUseCase` (`§5.3`). | **COVERED** |
| **RF-52** | Suit Hierarchy (`♣=4`, `♥=3`, `♠=2`, `♦=1`, `Coringa=Neutral`) with labels | R1 | `packages/domain/src/scales/suit.ts` (`§4`). | **COVERED** |
| **RF-53** | Team-Level Suit Axis Configuration (custom name or disabled) | R2 | `RoomSettingsBuilder.withSuits(enabled, label)` (`§5.2`). | **COVERED** |
| **RF-54** | Suit Distribution & Divergence Alert ($\ge 2$ ordinal levels) | R1 | `computeRoundStats` (`suitDivergence`, `§4`), `SuitDivergenceAlert` component (`§4`). | **COVERED** |
| **RF-55** | Strict Observer Mode (no deck UI, excluded from auto-reveal) | R1 | `PARTICIPANTS.mode = 'observer'`, enforced in `room.castVote` (`INV-03`) and `PokerTable` client view (`§4`). | **COVERED** |
| **RF-56** | Item Deck Figure Tags (`A`, `K`, `Q`, `J` with configurable meanings) | R3 | `packages/domain/src/scales/item-tag.ts`, `ItemTagBadge` component (`§4`), `items.figure_tag` (`§6.1`). | **COVERED** |
| **RF-60** | Automatic Aggregated History Recording on Final Estimate | R2 | `RecordAggregatedHistory` use case (`§4`), `HISTORY_ENTRIES` table (`§6.1`, `§6.2`). | **COVERED** |
| **RF-61** | Architectural Prohibition of Individual Votes in History | R2 | `HISTORY_ENTRIES` schema lacks participant/vote FKs; stores only `rounds_summary` JSONB (`§6.1`, `§6.2`). | **COVERED** |
| **RF-62** | History Search & Multi-Facet Filtering | R2 | `QueryHistory` use case, PostgreSQL B-Tree & GIN (`pg_trgm`) indexes (`§2 Layer 6`), `GET /api/teams/:id/history` (`§7.2`). | **COVERED** |
| **RF-63** | History Export (UTF-8 BOM CSV with injection protection & JSON) | R2 | `Exporter` port, `@fibonaipe/adapter-exporter-csvjson` (`§4`, `§11.2`), `GET /api/teams/:id/history/export` (`§7.2`). | **COVERED** |
| **RF-64** | Ephemeral Room Session Summary Export (CSV/JSON) | R1 | `ExportRoomSummary` use case, `GET /api/rooms/:code/summary?format=csv\|json` (`§7.2`). | **COVERED** |
| **RF-65** | Post-Estimation Edit with Mandatory Audit Trail (`EstimateAudit`) | R2 | `EditFinalEstimateWithAudit` use case (`§4`), `ESTIMATE_AUDITS` table (`§6.1`). | **COVERED** |
| **RF-70** | Sprint Lifecycle (`planned` $\rightarrow$ `active` $\rightarrow$ `closed`, no overlap) | R3 | `Sprint` aggregate & `SprintBuilder` (`packages/domain/src/entities/sprint.ts`), `SPRINTS` table (`§6.1`), `/api/teams/:id/sprints` (`§7.2`). | **COVERED** |
| **RF-71** | Member Capacity Calculation (working days, absences, `focusPct`) | R3 | `computeWorkingDays` & `computeCapacity` (`packages/domain/src/math/capacity.ts`), `CAPACITY_ENTRIES` table (`§6.1`). | **COVERED** |
| **RF-72** | Scope Commitment Snapshot & `addedAfterStart` Flag | R3 | `ActivateSprint` use case (`§4`), `sprints.committed_points` & `items.added_after_start` (`§6.1`). | **COVERED** |
| **RF-73** | Delivery Tracking (`Done` = 100%, incomplete = 0 + `carriedOver`, burst flag) | R3 | `MarkItemDone` use case (`§4`), `items.estimate_exceeded`, `items.carried_over`, `items.done_at` (`§6.1`). | **COVERED** |
| **RF-74** | Immutable Sprint Closure (`SprintReport` snapshot) | R3 | `CloseSprint` use case (`§4`), `sprints.frozen_report` JSONB (`§6.1`, `INV-10`). | **COVERED** |
| **RF-75** | Team Holiday & Non-Working Day Calendar | R3 | `Holiday` entity (`sprint.ts`), `HOLIDAYS` table (`§6.1`), `computeWorkingDays` (`§4`). | **COVERED** |
| **RF-80** | Velocity SVG Chart (Committed vs. Delivered + `addedAfterStart`) + HTML Table | R3 | `VelocitySvgChart` + `AccessibleDataTable` (`apps/web/src/client/components/charts`, `§4`, `ADR-06`). | **COVERED** |
| **RF-81** | Capacity & Pace (`velocity / capacity`) SVG Chart + HTML Table | R3 | `CapacitySvgChart` + `AccessibleDataTable` (`§4`, `ADR-06`). | **COVERED** |
| **RF-82** | Statistical Next-Sprint Forecast (median pace, P25–P75 / min–max band) | R4 | `computeForecast` (`packages/domain/src/math/forecast.ts`), `ForecastBandChart` (`§4`), `GET /api/teams/:id/forecast` (`§7.2`). | **COVERED** |
| **RF-83** | Estimation Quality Observability (1st-round consensus, Suit $\times$ Overrun matrix) | R3 | `computeEstimationIndicators` (`packages/domain/src/math/indicators.ts`), `GET /api/teams/:id/dashboard` (`§7.2`). | **COVERED** |
| **RF-84** | Forecast Accuracy Tracking (`predicted` vs. `delivered`, `errorPct`) | R4 | `computeAccuracy` (`forecast.ts`), `FORECAST_RECORDS` table (`§6.1`). | **COVERED** |
| **RF-85** | Insufficient Data Guard ($< 3$ closed sprints) | R4 | `INSUFFICIENT_DATA` error code (`§5.1`), `MIN_SPRINTS_FOR_FORECAST = 3` (`§4`), empty-state progress UI. | **COVERED** |
| **RF-86** | Dashboard Analytical Filters & Dataset/Chart Export (CSV/JSON/SVG/PNG) | R4 | Dashboard query filters + `@fibonaipe/adapter-exporter-csvjson` & client SVG/Canvas serializer (`§4`). | **COVERED** |
| **RF-90** | `IssueTracker` Port & Manual/CSV Adapter | R1 | `issue-tracker.port.ts`, `@fibonaipe/adapter-issuetracker-manual`, `describeIssueTrackerContract` (`§4`). | **COVERED** |
| **RF-91** | ClickUp Read-Only Adapter with Encrypted Token | R4 | `@fibonaipe/adapter-issuetracker-clickup`, `CryptoVault` port (`AES-256-GCM` in `@fibonaipe/adapter-system`, `§4`, `§11.2`). | **COVERED** |
| **RF-92** | Jira Cloud Read-Only Adapter | R4 | `@fibonaipe/adapter-issuetracker-jira` (`§4`). | **COVERED** |
| **RF-93** | Reverse Sync (Write Estimate Back to ClickUp/Jira) | Post-MVP | Planned `writeEstimate` method on `IssueTracker` port (`§4`, `§2`). | **COVERED** |
| **RF-94** | Pluggable Issue Tracker Adapters without Domain Changes | Post-MVP | Isolated `packages/adapter-issuetracker-*` architecture (`§1.1`, `§4`). | **COVERED** |
| **RF-95** | Multi-Language (`pt-BR` default, `en-US`, `es-ES`) & Theme (`Light`/`Dark`/`System`) | R1 | `apps/web/src/client/i18n/`, `tokens.css`, `tools/check-i18n.mjs` (`§4`, `§11.3`). | **COVERED** |
| **RF-96** | Preference Persistence (`localStorage` for guests, DB profile for auth) | R2 | Browser `localStorage` (`§2 Layer 5`) + `PATCH /api/me/preferences` (`§7.2`). | **COVERED** |

### 2.2 Mathematical Rules (`§5.1`–`§5.3`) & Domain Invariants (`INV-01`–`INV-14`)

| Rule / Invariant | Requirement Specification | Architecture Mapping in `.docs/technologies.md` | Status |
| :--- | :--- | :--- | :---: |
| **Math §5.1–§5.3** | Pure deterministic functions for `computeRoundStats`, `computeWorkingDays`, `computeCapacity`, `computeForecast` (median pace, P25–P75 for $N=6$, min–max for $3 \le N < 6$), `computeAccuracy` (`errorPct`) | Implemented in `packages/domain/src/math/{round-stats,capacity,indicators,forecast}.ts` (`§2 Layer 7`, `§4`) and verified by `fast-check` property-based tests (`ADR-07`). | **COVERED** |
| **INV-01 to INV-14** | All 14 domain invariants (30-seat cap, single Host, voter eligibility, voting window, irreversible reveal, card/suit validity, final estimate auth, single current item/voting round, `EstimateAudit`, closed sprint immutability, single active sprint per item, 0/100% delivery rule, guest room TTL/privacy, case-insensitive unique nickname) | Enforced inside `@fibonaipe/domain` entities and Builders (`Room`, `RoomSettings`, `Participant`, `Item`, `Team`, `Sprint`) returning `Result<T, AppError>`, with `≥ 90%` unit/property test coverage (`§1.2`, `§1.3`, `§4`, `§11.3`). | **COVERED** |

### 2.3 Non-Functional Requirements (`RNF-01` to `RNF-26`) & UX/Juice Addendum

| RNF ID / Section | Requirement Target | Architecture Mapping in `.docs/technologies.md` | Status |
| :--- | :--- | :--- | :---: |
| **RNF-01** | Realtime propagation $\le 1\text{s}$ p95 | Supabase Realtime WebSocket Broadcast + `2–3s` HTTP polling fallback (`ADR-05`). | **COVERED** |
| **RNF-02** | LCP $< 2.5\text{s}$; Room initial JS bundle $\le 150\text{ KB}$ gzip | Vite 6 + CSS Modules (0 runtime CSS) + custom SVG charts + `tools/check-bundle-budget.mjs` gate (`ADR-06`, `§11.3`). | **COVERED** |
| **RNF-03 & RNF-20** | 30 concurrent participants/room within $0 Free Tier quotas + 80% alerts | Free-tier deployment architecture (`§8`) + `.docs/limits.md` quota tracking. | **COVERED** |
| **RNF-04 & RNF-05** | 99% availability, cold-start UX pill, `clientOpId` (ULID) idempotency & `Room.version` reconciliation | `ConnectionStatusPill` (`§4`, `§8`), `repos.idempotency.hasProcessed` in `CastVoteUseCase` (`§5.3`), `GET /api/rooms/:code/state?since=v` (`§7.2`). | **COVERED** |
| **RNF-06 & RNF-07** | Mobile-first `360px`, `44×44px` touch targets, `1920×1080` Screen Mode | `tokens.css`, Playwright multi-viewport suite (`360×640`, `1280×720`, `1920×1080`, `§11.3`). | **COVERED** |
| **RNF-08, RNF-09, RNF-10** | WCAG 2.2 AA, non-color semantics, `aria-live`, `prefers-reduced-motion`, SVG + HTML table, `@axe-core/playwright` | `AccessibleDataTable`, `global.css` reduced-motion overrides, `@axe-core/playwright` in `npm run verify` (`§4`, `§11.3`). | **COVERED** |
| **RNF-11** | Zero hardcoded strings, `Intl` formatting | `apps/web/src/client/i18n/` + automated `tools/check-i18n.mjs` gate (`§4`, `§11.3`). | **COVERED** |
| **RNF-12, RNF-13, RNF-26** | HTTPS, CSPRNG, Zod validation, `Origin` check, CSV injection guard, `can(...)` server auth, vote secrecy, `SHA-256` cookies, rate limiting, `AES-256-GCM` token vault | Hono middleware (`app.ts`), `RateLimiter` port, `CryptoVault` port, `projectRoomForViewer`, `@fibonaipe/adapter-exporter-csvjson` (`§5.3`, `§11.2`). | **COVERED** |
| **RNF-14 & RNF-15** | LGPD data minimization, account deletion, 60-min anonymous room purge without PII logs | `DeleteAccount` use case, `PurgeExpiredRooms` cron (`/api/internal/cron/purge-expired-rooms`), structured log redaction (`§7.2`, `§11.2`). | **COVERED** |
| **RNF-16, RNF-17, RNF-18** | Strict Hexagonal architecture, contract tests in `packages/testing`, $\ge 90\%$ coverage, `npm run verify` | `packages/domain`, `packages/application`, `packages/testing` (`describe*Contract`), `tools/check-boundaries.mjs` (`§4`, `§11.3`). | **COVERED** |
| **RNF-19** | Structured JSON logs (`requestId`, `roomId`, `useCase`, `errorCode`, `durationMs`) with zero PII/votes | `StructuredLogger` port (`packages/application/src/ports/logger.port.ts`) + log-scrubbing unit test (`§11.2`). | **COVERED** |
| **RNF-21 & RNF-22** | Modern browser support & installable PWA (`manifest.webmanifest` + Service Worker) | `vite-plugin-pwa`, `apps/web/public/manifest.webmanifest` (`§2 Layer 1`, `§4`). | **COVERED** |
| **RNF-23** | Versioned SQL migrations, `SELECT ... FOR UPDATE` room lock, UTC `timestamptz` | `@fibonaipe/adapter-persistence-postgres` transaction strategy (`§6.2`). | **COVERED** |
| **RNF-24 & RNF-25** | Pure `npm workspaces` (`package-lock.json`), `.nvmrc`, permissive license gate | Root `package-lock.json`, `.nvmrc`, `tools/check-licenses.mjs` (`§4`, `§10.5`, `§11.3`). | **COVERED** |
| **UX / Juice Addendum** | 7 Action/Reaction micro-interactions (Card Selection, Suit Toggle, 3D Card Reveal $\le 450\text{ms}$, Consensus/Suit Divergence highlights, Timer alerts, Reconnection Pill, Interactive SVG Charts) + `prefers-reduced-motion: reduce` alternatives | Mapped to dedicated components in `apps/web/src/client/components/{deck,table,queue,charts,status}` and motion/contrast tokens in `tokens.css` & `global.css` (`§4`). | **COVERED** |

---

## 3. Risks, Mitigations & Alternatives Brief

### 3.1 Free-Tier Deployment (`RNF-03`, `RNF-04`, `RNF-20`)

| Risk | Impact | Architectural Mitigation in Blueprint | Viable Free-Tier Alternatives |
| :--- | :--- | :--- | :--- |
| **Serverless & Free-Tier DB Cold Starts** (Neon scale-to-zero after 5 min idle or Supabase free-tier project pause after 7 days of inactivity) | Initial room creation or join latency spikes to `2–5s`, risking user drop-off or perceived broken UI. | 1. **Optimistic UI & `ConnectionStatusPill` (`RNF-04`):** Displays *"Reconectando / Acordando servidor..."* after `1.5s` while holding local actions in the `clientOpId` queue.<br>2. **Scheduled Keep-Alive & Purge Cron (`§4`):** Hourly GitHub Actions cron (`cron-purge.yml`) hits `POST /api/internal/cron/purge-expired-rooms`, preventing 7-day inactivity pauses on Supabase and cleaning expired rooms (`RNF-15`). | **Compute:** Cloudflare Pages/Workers (0ms V8 isolate cold start) vs. Vercel Functions.<br>**Database:** Supabase Free (always-on with hourly cron activity, 500 MB) vs. Neon Free (instant branch/autoscaling, 0.5 GB) vs. self-hosted PostgreSQL / SQLite (`node:sqlite`) on a single free Render/Fly container. |
| **PostgreSQL Connection Exhaustion on Serverless** (Each concurrent Hono request + `SELECT ... FOR UPDATE` transaction holding a connection) | Exceeding free-tier connection limits (e.g., 60 direct connections) under 30-participant simultaneous voting bursts. | 1. **Transaction Pooler (PgBouncer / Supavisor):** Configure `DATABASE_URL` to use port `6543` (transaction mode) with `postgres.js` (`prepare: false` when behind transaction pooler).<br>2. **Short Lock Scope (`§5.3`):** `RealtimePublisher.publish()` executes strictly **outside and after** the `COMMIT` block so network I/O never holds a DB row lock. | Use **Cloudflare Hyperdrive** (free tier included with Workers) or **Supabase Supavisor** in transaction pooling mode. |
| **Supabase Realtime Concurrent Connection Quota** (200 concurrent WebSocket connections on Supabase Free Tier) | ~6 concurrent 30-person rooms saturate the free WebSocket quota. | 1. **Automatic Degradation to HTTP Polling (`ADR-05`):** When WebSocket connection fails or hits quota, `RealtimeClient` seamlessly falls back to `2–3s` polling (`GET /api/rooms/:code/state?since=v`).<br>2. **80% Quota Alerting (`RNF-20`):** Logged via `StructuredLogger` when active connections approach 160 (`80%` of 200). | 1. **`REALTIME_DRIVER=polling-only`** (zero external WS service cost).<br>2. **Cloudflare Durable Objects** (WebSocket Hibernation API) as a future drop-in adapter for `RealtimePublisher`/`RealtimeClient`. |

### 3.2 Realtime Fallback & State Synchronization (`RNF-01`, `RNF-05`, `RNF-13`)

| Risk | Impact | Architectural Mitigation in Blueprint | Alternative Strategies Considered |
| :--- | :--- | :--- | :--- |
| **Corporate Firewalls Blocking WebSockets (`WSS`)** or mobile network switching (Wi-Fi $\leftrightarrow$ 4G) | Participants miss `vote.changed` or `round.revealed` events, stalling the planning session. | 1. **Dual-Transport `RealtimeClient` Adapter (`ADR-05`):** Automatically switches to HTTP polling (`GET /api/rooms/:code/state?since=v` every `2–3s`) whenever the WebSocket channel disconnects or misses a heartbeat.<br>2. **Monotonic `Room.version` Gap Detection (`§8.2`):** If a client receives an event with `version > localVersion + 1`, it immediately fetches the authoritative snapshot from `/state?since=v`. | **Server-Sent Events (SSE):** Simpler than WS over HTTP/2, but holds open serverless execution duration on billed/free functions. Conditional short-polling (`?since=v` returning `304 Not Modified`) is safer for serverless free tiers. |
| **Polling Thundering Herd** (30 participants polling `/state` every `2s` = 15 req/s per room during WS outage) | Increased DB reads and serverless invocations. | 1. **Lightweight Version Check (`?since=v`):** When `Room.version === since`, the server returns `304 Not Modified` (or `{ unchanged: true, version }`) via a single indexed primary-key lookup (`SELECT version FROM rooms WHERE code = $1`) without hydrating child tables (`participants`, `items`, `rounds`, `votes`).<br>2. **Jittered Polling Interval:** Add `±300ms` random client jitter to the `2–3s` polling interval. | Edge caching of `/state` is **rejected** because `projectRoomForViewer` produces viewer-specific payloads (each voter sees their own unrevealed card while others see only `hasVoted: true`). |
| **Duplicate Vote Submissions on Reconnect** | Double-counted mutations or out-of-order vote overwrites. | **ULID `clientOpId` Idempotency (`§5.3`, `RNF-05`):** Every mutation carries `clientOpId`; `repos.idempotency.hasProcessed` inside the room lock transaction deduplicates retries deterministically. | Optimistic locking (`If-Match: <version>`) on votes was rejected because two voters voting simultaneously shouldn't reject each other's votes; room-level `SELECT ... FOR UPDATE` + `clientOpId` succeeds on first try. |

### 3.3 Hexagonal Boundary Enforcement (`RNF-16`, `RNF-17`, `RNF-18`)

| Risk | Impact | Architectural Mitigation in Blueprint | Alternative Enforcement Tools |
| :--- | :--- | :--- | :--- |
| **Accidental Impure Imports in `@fibonaipe/domain` or `@fibonaipe/application`** (e.g., importing `postgres`, `hono`, `Date.now()`, `Math.random()`, `process.env`, or cross-importing adapters) | Breaks deterministic testing, leaks infrastructure into business rules, and violates `RNF-16`. | **Three-Layer Automated Defense in `npm run verify` (`§11.1`, `§11.3`):**<br>1. **`package.json` Isolation:** `packages/domain/package.json` has zero `dependencies`; `packages/application/package.json` depends only on `@fibonaipe/domain`.<br>2. **ESLint Rules (`eslint.config.js`):** `no-restricted-globals` and `no-restricted-syntax` ban `Date.now()`, `new Date()` (0 args), `Math.random()`, `crypto.randomUUID()`, and `process.env` in `domain` and `application`.<br>3. **`tools/check-boundaries.mjs` + Negative Fixtures:** Custom Node AST/import scanner verifying the inward dependency law and testing itself against intentional violation fixtures (`tools/boundary-fixtures`). | **`dependency-cruiser` or `eslint-plugin-boundaries`:** Can be used, but a zero-dependency Node script (`tools/check-boundaries.mjs`) + standard ESLint flat config avoids external plugin version lag on ESLint v9 / Node v24. |
| **Divergence Between In-Memory Fakes and Production Adapters** | Unit tests pass against `InMemoryPersistence`, but production fails on PostgreSQL locking or constraints. | **Shared Contract Test Suites (`packages/testing/src/contracts/*.contract.ts`, `RNF-17`):** Every port defines a reusable `describe*Contract(factory)` suite (e.g., `describePersistenceContract`) that runs against `InMemoryPersistence` in every CI run and against `@fibonaipe/adapter-persistence-postgres` in integration checks. | Using `node:sqlite` as the fake DB was considered, but a pure TypeScript `InMemoryPersistence` with an explicit per-room async mutex (`§4`) is faster (`< 1ms` per test) and enforces exact domain object immutability. |

---

## 4. Final Conclusion

No architectural gaps, unmapped requirements, or host incompatibilities were found. The workspace is ready to proceed with implementation starting at **Release 0 (Architectural Foundation)** under the `npm run verify` quality gate.
