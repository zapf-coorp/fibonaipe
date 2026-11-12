# Spec: API and realtime

Hono routes in `apps/web/src/server/routes` are thin: validate with Zod, call a use case, map the `Result`. Authorization is decided only by `can(...)` on the server. Requirements: RNF-01, RNF-05, RNF-12, RNF-13.

## Envelopes and conventions

- **Idempotency.** Every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) accepts `"clientOpId": "<ULID>"` in the JSON body or an `X-Client-Op-Id` header. The pair `(actorId, clientOpId)` is not scoped by room and never expires.
- **Error body.**

  ```json
  { "error": { "code": "ROOM_FULL", "messageKey": "errors.ROOM_FULL", "params": { "max": 30 } } }
  ```

- **Status mapping.**

  | Error | HTTP |
  | :--- | :--- |
  | `VALIDATION` | 400 |
  | `AUTH_LINK_INVALID`, unauthenticated | 401 |
  | `FORBIDDEN`, `ACCOUNT_SUSPENDED` | 403 |
  | `NOT_FOUND` | 404, identical payload to prevent room or account enumeration |
  | `NICKNAME_TAKEN`, `ROOM_FULL`, `ROUND_NOT_VOTING`, `LAST_ADMIN`, `INSUFFICIENT_DATA` | 409 |
  | `LIMIT_EXCEEDED` | 422 |
  | `RATE_LIMITED` | 429 with `Retry-After` and `params.retryAfterSec` |

- **CSRF.** Mutating requests must send an `Origin` equal to `PUBLIC_APP_URL`. A mismatch returns 403 `{ error: { code: "FORBIDDEN", messageKey: "errors.FORBIDDEN" } }`; a same-origin POST is not blocked.
- **Session.** Guest identity is the `fib_session` cookie: `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, holding a 256-bit opaque token. Only `SHA-256(token)` is stored. Tabs in the same browser profile share the cookie.
- **Health.** `GET /healthz` returns `Cache-Control: no-store, no-cache, must-revalidate`, `Content-Type` with `charset=utf-8`, and an `X-Request-Id` that is a 26-character Crockford id.

## Endpoints

| Rel | Method and path | Use case | Authorization |
| :---: | :--- | :--- | :--- |
| R0 | `GET /healthz` | Health and DB ping | Public |
| R1 | `POST /api/rooms` | `CreateRoom` | Public, 10/h/IP |
| R1 | `POST /api/rooms/:code/join` | `JoinRoom` | Public, 20/min/IP |
| R1 | `GET /api/rooms/:code/state?since=v&mode=screen` | `GetRoomSnapshot` | Participant or screen; unchanged response if `version == v` |
| R1 | `POST /api/rooms/:code/heartbeat` | `Heartbeat` | Participant |
| R1 | `POST /api/rooms/:code/votes` | `CastVote` (`card`, `suit`, `comment?`, `clientOpId`) | Voter |
| R1 | `DELETE /api/rooms/:code/votes` | `RetractVote` | Voter |
| R1 | `POST /api/rooms/:code/reveal` | `RevealRound` | Host or Facilitator |
| R1 | `POST /api/rooms/:code/rounds` | `NewRound` | Host or Facilitator |
| R1 | `PUT /api/rooms/:code/items/:id/estimate` | `SetFinalEstimate` | Host or Facilitator |
| R1 | `POST /api/rooms/:code/items` | `AddItem` | Host or Facilitator |
| R1 | `POST /api/rooms/:code/items/import` | `ImportItems` (`text`, `csv`, later `clickup`, `jira`) | Host or Facilitator |
| R1 | `POST /api/rooms/:code/items/reorder` | `ReorderItems` | Host or Facilitator |
| R1 | `POST /api/rooms/:code/items/:id/:action` | `SetCurrentItem`, `SkipItem`, `DeferItem` | Host or Facilitator |
| R1 | `PATCH /api/rooms/:code/settings` | `UpdateRoomSettings` | Host |
| R1 | `POST /api/rooms/:code/host` | `TransferHost`, `DelegateFacilitator` | Host |
| R1 | `GET /api/rooms/:code/summary?format=csv\|json` | `ExportRoomSummary` | Any participant |
| R1 | `POST /api/internal/cron/purge-expired-rooms` | `PurgeExpiredRooms` | `x-cron-secret` header equal to `CRON_SECRET` |
| R2 | `POST /api/auth/magic-link`, `GET /api/auth/google`, `POST /api/auth/callback`, `POST /api/auth/logout` | `AuthProvider` flows | Public or authenticated |
| R2 | `DELETE /api/me`, `PATCH /api/me/preferences` | `DeleteAccount`, `UpdatePreferences` | Authenticated |
| R2 | `POST /api/rooms/:code/claim` | `ClaimRoom` | Host token plus authenticated team member |
| R2 | `GET, POST /api/teams`, `GET /api/teams/:id`, `POST /api/teams/:id/invites`, `PATCH, DELETE /api/teams/:id/members/:uid` | Teams and RBAC | `can(actor, "manageTeam")`; unknown team is 404 with an IDOR-safe body |
| R2 | `GET /api/teams/:id/history`, `GET /api/teams/:id/history/export` | `QueryHistory`, `ExportHistory` | `viewDashboard`, `exportTeamData` |
| R2 | `GET /api/admin/overview`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/status` | SuperAdmin management | `manageInstance` (403 for others) |
| R3 | `GET, POST /api/teams/:id/sprints`, `PUT /api/sprints/:id/capacity`, `POST /api/sprints/:id/activate`, `POST /api/sprints/:id/close` | Sprint lifecycle and capacity | `configureSprints` |
| R3, R4 | `GET /api/teams/:id/dashboard`, `GET /api/teams/:id/forecast` | Velocity, capacity, indicators, forecast | `viewDashboard`; exports need `exportTeamData` (observers get `FORBIDDEN`) |

Routes marked R2 or later ship progressively; see [roadmap](../prd/roadmap.md#pending-work-in-r2) for what is still missing.

## Realtime protocol

Every event has the envelope `{ type, roomId, version, at, payload }`, where `version` copies `room.version` and `at` is `now.toISOString()`. Events are published only after the transaction commits.

| Event | Payload |
| :--- | :--- |
| `room.settings_updated` | `{ name }` |
| `participant.joined`, `participant.updated`, `participant.disconnected` | `{ participantId }` |
| `host.transferred` | `{ fromParticipantId, toParticipantId }` |
| `item.queue_updated` | `{ itemIds }` |
| `round.started` | `{ roundId, itemId }` |
| `vote.changed` | `{ participantId, hasVoted }` |
| `round.revealed` | `{ roundId }` |
| `item.estimate_finalized` | `{ itemId }` |
| `timer.updated` | `{ endsAt }` |
| `room.claimed` | `{ teamId }` |

### Vote secrecy

- `vote.changed` never carries card, suit or comment. `round.revealed` fixtures carry only `{ roundId }`.
- Card and suit values leave the server only inside the snapshot projected by `projectRoomForViewer` after `Round.status === "revealed"`. Before reveal, other participants' values are stripped. A `fast-check` property test over 1,000+ random room states and viewer roles (`voter`, `observer`, `screen`, `host`) guards this.

### Versioned sync

Every mutation increments `Room.version`. Clients apply events in order (`version === local + 1`). On a gap, or in polling fallback, they fetch `GET /api/rooms/:code/state?since=v`. The Realtime client moves `reconnecting` then `polling` within 10 s; a version gap triggers exactly one snapshot fetch and reports `onVersionGap({ roomId, expectedVersion, receivedVersion })`.

### Client resilience

The client queues mutations with `clientOpId`, resends them on reconnect and reconciles by `Room.version`. Polling fallback runs every 2–3 s; heartbeat every 20 s. A participant counts as `online` for 45 s after the last heartbeat or event.

## Locked decisions

- `subscribe` has no `sinceVersion`; a client starts at version 0 and emits `connected` immediately. Connection state is `{ status, pendingOpCount, lastSyncedVersion }`, and `pendingOpCount` stays 0 in the port because it has no local-op queue.
- Realtime `createRealtimeClient` takes an injected provider. Outage tests use fake timers.
- Missing `findById` and `findByCode` results are `null`. Persistence has no `Clock`: a locked update stores the caller's `lastActivityAt` and version `previousCommittedVersion + 1`; the first insert stores the caller's `version`.
- Persistence `503` has no injection hook, and other `AppError` status rows have no R0 route.
- Auth routes shipped so far: `POST /api/auth/magic-link`, `POST /api/auth/callback`, `GET /api/admin/users`, `POST /api/teams`, `GET /api/teams/:id`. `applyAccountLocale` overwrites `fibonaipe.locale` and the active catalog.
- `DeleteAccount` confirmation that does not match (trim, lowercase compare) returns `VALIDATION`. `AuthProvider` has no `deleteIdentity`; delete revokes the existing session. A team member still chooses Voter or Observer at join. Login without provider keys stays on the unavailable auth driver.
