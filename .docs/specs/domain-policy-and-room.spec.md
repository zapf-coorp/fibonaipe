# Spec: `domain-policy-and-room` — Permission matrix `can`, `Room` and `Participant` aggregates, builders, capacity, nicknames, host transfer

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `domain-policy-and-room` |
| **Release** | `R1` (policy reused by R2–R4) |
| **Priority** | `M` |
| **Dependencies** | `monorepo-foundation`, `domain-scales-and-stats` |
| **Requirements** | `RF-11`, `RF-20`, `RF-23`, `RF-24`, `RF-25`, `RF-55`, `INV-01`, `INV-02`, `INV-14`, `RNF-13`, permission matrix §3 |
| **Packages** | `@fibonaipe/domain` |

### Perspectives

- **SA:** `can(actor, action, ctx)` is the only authorization function. Aggregates enforce room invariants. HTTP handlers must not duplicate these rules.
- **UX:** Join failures surface stable codes (`ROOM_FULL`, `NICKNAME_TAKEN`) that the entry screen maps to i18n. Host loss is recoverable without orphaning the room.
- **TA:** `RoomBuilder` and `RoomSettingsBuilder`. Mutations return new immutable snapshots plus domain events, or `Result` errors. `Clock` is a parameter (`now: Date`), never `Date.now()` inside the aggregate.

---

## Functionalities & Core Capabilities

1. **`can(actor, action, ctx): boolean`.** Actor is `{ kind: 'guest' | 'member', systemRole?, teamRole?, isHost, isFacilitator, roomMode: 'voter' | 'observer' }`. Actions: `manageInstance`, `manageTeam`, `configureSprints`, `createTeamRoom`, `createGuestRoom`, `hostRoom`, `vote`, `revealRound`, `setFinalEstimate`, `manageQueue`, `updateRoomSettings`, `transferHost`, `viewDashboard`, `exportTeamData`, `exportOwnRoomSummary`. The matrix in requirements §3 is the test table. Observers never vote. Guests host only the room they created. A delegated facilitator may reveal, set the estimate, and manage the queue, and may not change settings or transfer host. Voting is allowed for anyone who entered as `voter`, independent of team role.
2. **`RoomSettings`.** Active scale id, suit axis enabled plus label key (default `risk`), `autoReveal`, `showAverage`, optional `timerSeconds`, `maxParticipants = 30`, `allowObserverComments` (default false, used in R3). Built by `RoomSettingsBuilder` with valid defaults.
3. **`Room` aggregate.** Fields: `id`, `code`, `name`, `kind` (`guest` | `team`), optional `teamId`, `hostParticipantId`, `scale`, `settings`, `status` (`open` | `closed`), `version`, `lastActivityAt`, optional `expiresAt`. Operations: `join`, `rejoin`, `updateSettings`, `transferHost`, `autoTransferHost(now)`, `delegateFacilitator`, `revokeFacilitator`, `close`. `RoomBuilder` supplies ids, code, scale, host, and clock values from outside.
4. **`Participant`.** `id`, `roomId`, optional `userId`, optional `guestSessionId`, `nickname`, informational `role`, `mode` (`voter` | `observer`), `isFacilitator`, `joinedAt`, `lastSeenAt`, `afk`. `canVote` is true only when mode is `voter` and `afk` is false.
5. **INV-01.** The 31st distinct participant returns `ROOM_FULL`. Rejoin of the same `guestSessionId` or `userId` does not consume a new seat. Screen viewers are not participants (handled by the projector spec).
6. **INV-02.** Exactly one host while status is `open`.
7. **INV-14.** Nickname length 1–30 after trim, no control characters, unique in the room case-insensitively (`NICKNAME_TAKEN`).
8. **Host transfer.** Manual transfer only by the current host (`FORBIDDEN` otherwise). `autoTransferHost(now)` runs when host `lastSeenAt` is older than `HOST_GRACE_SECONDS` (60) and another participant is online (`now - lastSeenAt <= ONLINE_WINDOW_SECONDS`). Order: delegated facilitator, then team-role priority PM > PO > Dev > QA > Observer, then earliest `joinedAt`. Emits `host.changed` with reason `auto`. A room with only the host does not transfer.
9. **Settings changes.** `votingRoles` / mode rules apply from the next round, not the open round. Suit axis can be turned off; existing votes keep their suits but new votes omit the suit control.

---

## Use Cases & Scenarios

### UC-1 — Room fills and a known guest returns

**Given** 30 participants, **when** a new nickname joins, **then** `ROOM_FULL`. **When** participant 7 reconnects with the same `guestSessionId`, **then** the same `participantId` is returned and the count stays 30.

### UC-2 — Nickname collision

**Given** `Ana` is in the room, **when** `ana` joins, **then** `NICKNAME_TAKEN`. **When** the nickname is empty or contains a control character, **then** `VALIDATION`.

### UC-3 — Host drops offline

**Given** the host has been unseen for 61 seconds, a facilitator is online, and a PM joined earlier, **when** `autoTransferHost(now)` runs, **then** the facilitator becomes host and the event reason is `auto`. **Given** no facilitator, **then** the online PM wins over an online Dev. **Given** two Devs, **then** the earlier `joinedAt` wins. **When** a non-host calls `transferHost`, **then** `FORBIDDEN`.

### UC-4 — Permission table

Every cell of requirements §3 is one row in a generated test. A guest who did not create the room cannot `updateRoomSettings`. An observer `can` `viewDashboard` for a team room and cannot `exportTeamData`. SuperAdmin can `manageInstance`.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

| Operation | Success | Error |
| :--- | :--- | :--- |
| `RoomBuilder.build()` | `Room` | `VALIDATION` if name empty, scale missing, or maxParticipants ≠ 30 |
| `join` | `{ room, participant, events }` | `ROOM_FULL`, `NICKNAME_TAKEN`, `VALIDATION` |
| `rejoin` | same participant, refreshed `lastSeenAt` | `NOT_FOUND` if session unknown |
| `updateSettings` | new settings, `settings.changed` | `FORBIDDEN` if actor is not host |
| `transferHost` | new host, `host.changed(manual)` | `FORBIDDEN`, `NOT_FOUND` |
| `autoTransferHost` | unchanged room, or new host | no error when transfer is not due |
| `can` | `boolean` | never throws |

Events at this layer are plain data `{ type, payload }` without vote values.

---

## Flow & states

Room status: `open → closed`. Closed rejects join, settings, and transfer with `FORBIDDEN`.

Participant presence is derived, not stored as a boolean: `online = (now - lastSeenAt) <= 45s`. AFK is an explicit flag set by the participant and clears their live vote eligibility.

Host identity is a single field. Delegate facilitator is a boolean on the participant, at most one recommended; if several are set, auto-transfer picks the earliest `joinedAt` among facilitators.

---

## Technical design / how-to

1. `packages/domain/src/policy/can.ts` holds the matrix as data (`Record<action, predicate>`) so tests can iterate actions.
2. `packages/domain/src/room/room.ts` and `participant.ts`. Public API is methods on the aggregate; fields are `readonly`.
3. Builders in `room-builder.ts` and `room-settings-builder.ts`. `build()` checks invariants and returns `Result`.
4. Pass `now: Date` into any method that reads time. Do not call `Date.now`.
5. Nickname normalization: trim, strip control chars, compare with `localeCompare` sensitivity `accent` and case-insensitive folding via `toLocaleLowerCase('pt-BR')` on a copy used only for uniqueness.
6. Return domain events from mutations so the application layer can publish them after commit. The aggregate itself does not know about WebSocket.
7. Tests: one table for `can`, one for capacity, one for nickname, one for auto-transfer tie-breaks including a single-participant room.

---

## Files to touch

- `packages/domain/src/policy/can.ts`
- `packages/domain/src/policy/can.test.ts`
- `packages/domain/src/room/participant.ts`
- `packages/domain/src/room/room.ts`
- `packages/domain/src/room/room-builder.ts`
- `packages/domain/src/room/room-settings-builder.ts`
- `packages/domain/src/room/room.test.ts`
- `packages/domain/src/index.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| 30 seated people | 31st `join` | `ROOM_FULL` |
| Same `guestSessionId` | `rejoin` | same id, count unchanged |
| Nickname `Ana` | join `ana` | `NICKNAME_TAKEN` |
| Host unseen 61s, facilitator online | `autoTransferHost` | facilitator is host, reason `auto` |
| Non-host | `transferHost` | `FORBIDDEN` |
| Observer | `can(..., 'vote')` | `false` |
| Guest creator | `can(..., 'hostRoom')` on that room | `true` |
| Any other guest | `can(..., 'updateRoomSettings')` | `false` |

**QA-red:** matrix test and invariant tests fail. **SE-green:** aggregates pass. **QA-verify:** no framework imports in `domain`, `npm run verify` green.
