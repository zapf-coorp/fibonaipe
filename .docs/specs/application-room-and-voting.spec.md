# Spec: `application-room-and-voting` — Transactional use cases for rooms, queue, voting, timer, export, and purge

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `application-room-and-voting` |
| **Release** | `R1` |
| **Priority** | `M` |
| **Dependencies** | `ports-and-testing-fakes`, `domain-policy-and-room`, `domain-item-round-vote` |
| **Requirements** | `RF-01`, `RF-02`, `RF-20`–`RF-26` (guest half), `RF-30`–`RF-33`, `RF-40`–`RF-49`, `RF-64`, `RNF-05`, `RNF-12`, `RNF-15`, `INV-13` |
| **Packages** | `@fibonaipe/application` use cases. Ports only. No Postgres, no React. |

### Perspectives

- **SA:** Every room mutation runs inside `Persistence.transaction({ lockRoomId })`, checks `can`, delegates to domain, commits, then publishes events. Publish never happens before commit.
- **UX:** Commands are idempotent via `clientOpId`. A retried vote does not double-apply. Rate limits return `RATE_LIMITED` with `retryAfterSec`.
- **TA:** Use-case classes receive ports in the constructor. They return `Result<T, AppError>`. Guest rooms get `expiresAt = lastActivity + 60 minutes` and never write team history.

---

## Functionalities & Core Capabilities

Use cases, each a class with `execute(input): Promise<Result<...>>`:

| Use case | Actor | Notes |
| :--- | :--- | :--- |
| `CreateRoom` | anyone | Rate-limit by IP. Persists room, host participant, stores only SHA-256 of host token. Returns room code and raw token once. |
| `JoinRoom` | anyone | Unknown code is `NOT_FOUND` with no similar-code hint. Sets nickname, mode, informational role. |
| `ReconnectParticipant` | cookie session | Valid token returns the same `participantId` and current vote. Invalid is `FORBIDDEN`. |
| `Heartbeat` | participant | Updates `lastSeenAt`. May call `autoTransferHost`. |
| `TransferHost` / `UpdateRoomSettings` / `CloseRoom` | host (settings and transfer) | As domain rules. |
| `GetRoomSnapshot` | participant or screen | `since == version` returns `{ unchanged: true }`. Otherwise `projectRoomForViewer`. |
| `AddItem`, `ReorderItems`, `SetCurrentItem`, `SkipItem`, `DeferItem`, `RemoveItem` | host or facilitator | Limits: 500 items, title 200, description 2000. |
| `ImportItems` | host or facilitator | Calls `IssueTracker.importItems`. Domain creates `Item`s. Tracker does not touch the room. |
| `CastVote`, `RetractVote` | voter | Dedup `(participantId, clientOpId)` for 10 minutes. Same card replay is a no-op. After commit, publish `vote.changed` without the card. Then evaluate auto-reveal. |
| `RevealRound`, `NewRound`, `SetFinalEstimate` | host or facilitator | Reveal publishes `round.revealed` without values. |
| `StartTimer`, `StopTimer` | host or facilitator | Writes `timerEndsAt` only. |
| `ExportRoomSummary` | any participant | CSV or JSON via `Exporter`. Includes items, final estimates, round aggregates. Does not include individual votes for guest rooms. |
| `PurgeExpiredRooms` | cron secret | Idempotent. Deletes guest rooms with no connection whose `lastActivityAt` is older than 60 minutes, cascading participants, items, rounds, votes. Log only the count. |

`RateLimiter` rules used here: 10 rooms per hour per IP, 20 code attempts per minute per IP, 60 mutations per minute per participant.

Guest rooms: `kind = guest`, no `teamId`, no history write, `expiresAt` refreshed on activity while someone is online, purge when empty for 60 minutes.

---

## Use Cases & Scenarios

### UC-1 — Create, join, vote, reveal, with a failed publish not rolling back the rule

**Given** a fake persistence and a fake realtime that records call order, **when** `CastVote` runs, **then** the vote is visible in the repository before `publish` is called. **When** two different participants cast concurrently, **then** both votes persist (lock serializes them). **When** the same `clientOpId` is repeated, **then** the second call is a no-op and does not publish a second event.

### UC-2 — Room full under concurrency

**Given** 29 participants, **when** two `JoinRoom` calls race for the last seats, **then** one succeeds and one returns `ROOM_FULL`. A 31st never persists.

### UC-3 — Reconnect keeps the vote

**Given** a voter has cast `8♣` and the process restarts, **when** `ReconnectParticipant` presents the hashed session, **then** the snapshot's `ownVote` is `8♣` and other viewers still only see `hasVoted` before reveal.

### UC-4 — Purge

**Given** `FakeClock` and a guest room idle for 59 minutes, **when** purge runs, **then** the room remains. **When** idle time is 61 minutes and nobody is online, **then** the room and children are gone. A second purge is a no-op. A team room is never purged by this use case. The log line contains a count and no nickname.

### UC-5 — Auto-reveal and timer

**Given** `autoReveal` and two online voters, **when** the second eligible voter votes, **then** the round becomes `revealed`. **When** nobody eligible is online, **then** a single vote does not reveal. **When** the timer hits zero, **then** no reveal is triggered by `StartTimer`'s stored timestamp alone.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

Every input is a plain object validated before the domain call (application-level schema lives with the HTTP spec; use cases trust already-parsed commands but still enforce domain `Result`s).

Shared error codes: `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `ROOM_FULL`, `NICKNAME_TAKEN`, `ROUND_NOT_VOTING`, `LIMIT_EXCEEDED`, `RATE_LIMITED`.

`CreateRoom` success: `{ code, hostToken, participantId }`. The token is not stored raw.

`GetRoomSnapshot` success: `{ unchanged: true, version }` or `{ unchanged: false, view: RoomView }`.

Publish list for a command is built inside the transaction and flushed only after `transaction` resolves. If publish fails, the use case returns a success with a warning flag `realtimePending: true` so the client polls; it does not roll back the committed vote.

---

## Flow & states

Command lifecycle: `rate-limit → transaction(lock) → authorize → domain → commit (version++) → publish → return`.

Idempotency key lifecycle: stored at commit, expires after 10 minutes (checked against `Clock`).

Guest room activity: any successful mutation or heartbeat from an online participant refreshes `lastActivityAt`. Purge selects `kind = guest AND open connections = 0 AND now - lastActivityAt >= 60 min`.

---

## Technical design / how-to

1. One file per use case under `packages/application/src/use-cases/rooms/` and `.../voting/`.
2. Constructor injection: `{ persistence, realtime, ids, clock, rateLimiter, issueTracker, exporter, logger }`. Tests pass fakes from `@fibonaipe/testing`.
3. Inside `transaction`, repositories read the room, domain methods produce the next state plus events, repositories save, version increments inside the port (contract already requires this).
4. After `await transaction`, loop events and `realtime.publish`. A test double that throws if `publish` is called before commit must pass.
5. `ImportItems` maps `ExternalItem` to `ItemBuilder`. It does not call tracker `writeEstimate`.
6. `PurgeExpiredRooms` is safe to run twice. It never deletes `kind = team`.
7. Do not log nicknames, emails, tokens, or vote cards. Log `useCase`, `roomId`, `errorCode`.

---

## Files to touch

- `packages/application/src/use-cases/rooms/create-room.ts`
- `packages/application/src/use-cases/rooms/join-room.ts`
- `packages/application/src/use-cases/rooms/reconnect-participant.ts`
- `packages/application/src/use-cases/rooms/heartbeat.ts`
- `packages/application/src/use-cases/rooms/room-commands.ts` (settings, transfer, close, snapshot)
- `packages/application/src/use-cases/items/item-commands.ts`
- `packages/application/src/use-cases/voting/voting-commands.ts`
- `packages/application/src/use-cases/rooms/export-room-summary.ts`
- `packages/application/src/use-cases/rooms/purge-expired-rooms.ts`
- `packages/application/src/use-cases/**/*.test.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Fake realtime spy | `CastVote` | publish happens after commit and payload has no card |
| Duplicate `clientOpId` | second `CastVote` | no extra row, no extra event |
| 29 people, two parallel joins | both execute | one `ROOM_FULL` |
| Valid guest cookie | `ReconnectParticipant` | same participant and own vote |
| Bad cookie | reconnect | `FORBIDDEN` |
| Unknown room code | `JoinRoom` | `NOT_FOUND` |
| Idle 61 min guest room | purge | deleted; log has count only |
| Team room idle | purge | still present |
| Over rate limit | `CreateRoom` | `RATE_LIMITED` |
| Last online voter votes with autoReveal | `CastVote` | round revealed |
| Timer elapsed | no extra command | round still `voting` |

**QA-red:** use-case tests against fakes, including the publish-order spy. **SE-green:** implement use cases. **QA-verify:** application package does not import `postgres`, `react`, or adapter packages.
