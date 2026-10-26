# Spec: `domain-item-round-vote` — Item, Round, and Vote aggregates, state machines, estimate audit, and non-leaking `projectRoomForViewer`

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `domain-item-round-vote` |
| **Release** | `R1` |
| **Priority** | `M` |
| **Dependencies** | `domain-scales-and-stats`, `domain-policy-and-room` |
| **Requirements** | `RF-30`–`RF-33`, `RF-40`–`RF-47`, `RF-49`, `INV-03`–`INV-09`, §5.2–§5.3 of the SDD protocol (events `EVT-01`–`EVT-12`) |
| **Packages** | `@fibonaipe/domain` for aggregates and stats call; `projectRoomForViewer` lives in `@fibonaipe/application` because it is a read model, but the leak rule is specified here and tested against domain fixtures. |

### Perspectives

- **SA:** One current item per room, one voting round per item, votes mutable only while `voting`, reveal irreversible, final estimate is a numeric scale card chosen by host or facilitator and may differ from the mean.
- **UX:** Before reveal, a viewer sees only their own vote and other people's `hasVoted`. After reveal, they see votes, suits, and `RoundStats`.
- **TA:** Aggregates return `Result` and domain events whose payloads never contain card values (`vote.changed` is `{ participantId, hasVoted }` only).

---

## Functionalities & Core Capabilities

1. **Item status machine.** `pending → current → estimated`. From `current`, also `skipped` or `deferred` (rounds already played are kept). `skipped` and `deferred` can return to `pending` or `current`. `estimated` can return to `current` only by opening a new round. At most one `current` item per room (`INV-08`).
2. **Item fields.** `id`, `roomId`, optional `teamId`, `title` (1–200), `description` (0–2000), optional `externalUrl` (`http`/`https` only), optional `externalKey`, `position`, `status`, optional `figureTag` (`A|K|Q|J`), optional `finalEstimate` (numeric card), optional `finalSuit` (predominant or host-chosen, stored as aggregate label only).
3. **Round machine.** `voting → revealed`. `newRound` creates round `n+1` in `voting` and keeps prior rounds. At most one `voting` round per item. Reveal is irreversible (`INV-05`).
4. **Vote.** One vote per `(roundId, participantId)` (`INV-03`). Create, change, and retract only while `voting` (`INV-04`). Card must pass `isValidVote` (`INV-06`). Observer or AFK voter receives `FORBIDDEN`. Optional `comment` up to 140 characters is accepted by the domain and is not part of history (UI arrives in R3).
5. **Auto-reveal predicate (pure).** True when `autoReveal` is on, at least one numeric-or-special vote exists, and every online, non-AFK voter has voted. The timer never reveals by itself. Timer only stores `timerEndsAt`.
6. **Final estimate.** Host or facilitator only (`INV-07`). Value must be a numeric card of the active scale, not `?`, `Coringa`, or `AFK`. Changing an existing final estimate returns an `EstimateAudit` `{ itemId, changedBy, at, from, to }` (`INV-09`).
7. **Skip and defer.** Preserve rounds and votes. Reordering is a list of all item ids; unknown or duplicate ids return `VALIDATION`.
8. **`projectRoomForViewer`.** Pure function `(room, items, rounds, votes, viewer, now) → RoomView`. While the round is `voting`, `RoomView` includes `ownVote` for the viewer and `hasVoted` for everyone else, and omits other cards, suits, and comments. After `revealed`, it includes `votes[]` and `stats`. `permissions` come from `can`. `online` uses the 45s window. `serverTime` and `version` are copied through. Viewer kind `screen` has no permissions, is not a participant, and sees the same vote visibility as an observer.
9. **Events `EVT-01`–`EVT-12`.** Envelope `{ type, roomId, version, at, payload }`. `vote.changed` payload is only `{ participantId, hasVoted }`. `round.revealed` payload is `{ roundId }` with no values. The client loads the snapshot after reveal.

---

## Use Cases & Scenarios

### UC-1 — Vote, change, retract, then reveal locks the round

**Given** a voting round, **when** a voter casts `5♣`, **then** one vote is stored and `vote.changed` has `hasVoted: true` and no card. **When** they change to `8♥`, **then** the previous card is replaced. **When** they retract, **then** no vote remains. **When** the round is revealed and they cast again, **then** `ROUND_NOT_VOTING`.

### UC-2 — New round keeps history of aggregates

**Given** round 1 is revealed with stats for `[3, 8]`, **when** the facilitator starts round 2, **then** round 1 stays `revealed` with its stats, round 2 is `voting`, and votes start empty. Setting final estimate `5` while the mean was `5.5` succeeds. Setting final estimate `?` returns `VALIDATION`.

### UC-3 — Non-leak property

**Given** two room states that differ only in the hidden card values of other people, **when** `projectRoomForViewer` runs for voter A during `voting`, **then** the two `RoomView` values are deeply equal except for A's own vote. The same property holds for a `screen` viewer (no own vote, no foreign values). After reveal, both views include the cards.

### UC-4 — Queue

**Given** item A is `current` with a voting round, **when** the host sets item B current, **then** A's round remains and B opens round 1. Skip and defer keep A's votes. Reorder with a missing id returns `VALIDATION`. Title over 200 or a `javascript:` URL returns `VALIDATION`.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

| Operation | Result |
| :--- | :--- |
| `castVote` | vote + `vote.changed` or `FORBIDDEN`, `ROUND_NOT_VOTING`, `VALIDATION` |
| `retractVote` | `vote.changed(hasVoted:false)` or `ROUND_NOT_VOTING` |
| `reveal` | `round.revealed` + stats snapshot or `FORBIDDEN` |
| `newRound` | new voting round, prior rounds intact |
| `setFinalEstimate` | item `estimated` or `VALIDATION` / `FORBIDDEN`; audit record when replacing |
| `skip` / `defer` | status change, rounds kept |
| `projectRoomForViewer` | `RoomView` always; never throws on a consistent aggregate |

`RoomView` fields: room meta, settings, participants (nickname, role, mode, online, afk, hasVoted), queue, current item, current round status, `ownVote?`, `votes?`, `stats?`, `permissions`, `serverTime`, `version`.

---

## Flow & states

```text
Item:    pending → current → estimated
                  ↘ skipped / deferred ↗ (back to pending or current)
Round:   voting → revealed
         revealed + newRound → round n+1 voting
```

Illegal transitions return `Result.err` and do not mutate. Tests enumerate every illegal edge.

Timer states: `idle` (`timerEndsAt = null`) and `running`. Reaching zero is a client concern driven by `serverTime`. The domain does not auto-reveal.

---

## Technical design / how-to

1. `packages/domain/src/planning/item.ts`, `round.ts`, `vote.ts`, `estimate-audit.ts` with private constructors and small command methods.
2. A `PlanningTable` (or methods on `Room`) coordinates the single-current-item rule so item methods cannot violate `INV-08` in isolation.
3. `packages/application/src/projection/project-room-for-viewer.ts` is a pure function. It calls `computeRoundStats` only when status is `revealed`. It calls `can` for `permissions`.
4. Add a property test: clone state, change another participant's card, project for A, expect equality during `voting`.
5. Builders (`ItemBuilder`) exist for tests and for import mapping. `build()` enforces title and URL rules.
6. Events are constructed in the aggregate as data objects. Application publishes them only after the persistence transaction commits (next spec).

---

## Files to touch

- `packages/domain/src/planning/item.ts`
- `packages/domain/src/planning/round.ts`
- `packages/domain/src/planning/vote.ts`
- `packages/domain/src/planning/estimate-audit.ts`
- `packages/domain/src/planning/planning-table.ts`
- `packages/domain/src/planning/planning-table.test.ts`
- `packages/application/src/projection/project-room-for-viewer.ts`
- `packages/application/src/projection/project-room-for-viewer.test.ts`
- `packages/application/src/projection/room-events.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Revealed round | `castVote` | `ROUND_NOT_VOTING` |
| Observer | `castVote` | `FORBIDDEN` |
| Card `4` on Fibonacci | `castVote` | `VALIDATION` |
| Revealed round 1 | `newRound` | round 2 voting, round 1 kept |
| Final estimate `?` | `setFinalEstimate` | `VALIDATION` |
| Final estimate changed | command | `EstimateAudit` with from, to, who, when |
| Two states differing only in others' cards | project for A while voting | views equal aside from `ownVote` |
| Screen viewer while voting | project | no vote values |
| `vote.changed` payload | inspect | no `card` or `suit` field |

**QA-red:** transition tests and the leak property fail. **SE-green:** aggregates and projector pass. **QA-verify:** domain stays free of I/O.
