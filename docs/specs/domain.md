# Spec: Domain

Covers aggregates, state machines, invariants, math and the authorization policy. All of it lives in `packages/domain` as pure, deterministic code. Requirements: [functional](../prd/functional-requirements.md).

## Aggregates and value objects

`Room` (with `RoomSettings`), `Participant`, `Item`, `Round`, `Vote`, `EstimateAudit`, `Organization`, `Team`, `Membership`, `Invite`, `Sprint`, `Holiday`; value objects `Scale`, `Card`, `Suit`, `FigureTag`.

State machines:

- Item: `pending → current → estimated | skipped | deferred`.
- Round: `voting → revealed`.
- Sprint: `planned → active → closed`.

## Invariants

| ID | Rule |
| :--- | :--- |
| INV-01 | A room holds at most 30 participants (Voters plus Observers). The 31st fails with `ROOM_FULL`. Same-session reconnects and projector tabs do not take a seat. |
| INV-02 | Every open room has exactly one active Host. |
| INV-03 | One vote per participant per round, only from Voters who are not `AFK`. |
| INV-04 | Votes can be created, changed or retracted only while `Round.status === "voting"`. |
| INV-05 | Reveal (`voting → revealed`) is irreversible. To vote again open round `n+1`, keeping earlier aggregate summaries. |
| INV-06 | A vote value must be in the room's active Fibonacci subset or a special card (`?`, `Coringa`, `AFK`); the suit must be in `{♣, ♥, ♠, ♦, Coringa}`. |
| INV-07 | Only the Host or a delegated Facilitator sets the final estimate, and it must be a valid numeric value of the active scale. |
| INV-08 | At most one `current` item per room and at most one `voting` round per item. |
| INV-09 | Changing a consolidated final estimate must produce an `EstimateAudit`. |
| INV-10 | A `closed` sprint has frozen metrics and rejects changes to items, dates or capacity. |
| INV-11 | An item belongs to at most one non-closed sprint (`planned` or `active`) at a time. |
| INV-12 | Delivered points equal the sum of final estimates of `Done` items at close. Unfinished items count 0 and return to the backlog with `carriedOver = true`. |
| INV-13 | Guest rooms never write permanent history and expire 60 minutes after the last connection drops. Team rooms write only per-round aggregates. |
| INV-14 | Nickname has 1 to 30 visible characters (no control characters) and is unique in the room, case-insensitive (`NICKNAME_TAKEN`). |

## Math

Pure functions, no rounding in intermediate steps. The UI formats: integer points or `½`, means with 1 decimal, pace with 2.

### Round statistics (`computeRoundStats`)

- Only numeric Fibonacci cards are eligible. `?`, `Coringa` and `AFK` are counted separately in `specialCounts`.
- `mean` = sum / count. `median` = middle value, or the average of the two middle values for an even count. `modes` = sorted list of the most frequent values; empty when every frequency is 1.
- `consensus` is true with 2 or more numeric votes that are all equal (min = max).
- `nearConsensus` is true when not `consensus`, with 2 or more numeric votes and a distance of at most 1 position on the active scale between min and max.
- `suitDivergence` is true when the ordinal spread of suits (♦ 1, ♠ 2, ♥ 3, ♣ 4, ignoring `Coringa`) is 2 or more.

### Capacity (`computeWorkingDays`, `computeCapacity`)

- `workingDays` = Monday to Friday days from `startDate` to `endDate` inclusive, minus team holidays that fall on weekdays.
- `availableDays_i = max(0, workingDays − absenceDays_i)`
- `capacity_i = availableDays_i × focusPct_i / 100`
- `capacityTotal = Σ capacity_i` (person-days)

### Velocity, pace and forecast (`computeForecast`, `computeAccuracy`)

- `deliveredPoints` = sum of final estimates of `Done` items at close.
- `pace_s = deliveredPoints_s / capacityTotal_s`, for closed sprints with `capacityTotal > 0`.
- Window: the last N eligible closed sprints with 3 ≤ N ≤ 6. With fewer than 3, return `{ status: "insufficient_data", have, need: 3 }` (error code `INSUFFICIENT_DATA`).
- `medianPace = median(pace_1..pace_N)`; `predicted = plannedCapacity × medianPace`.
- Range: with N = 6 use linear-interpolated P25 and P75 (`low = plannedCapacity × P25`, `high = plannedCapacity × P75`). With 3 ≤ N < 6 use min and max pace.
- Risk adjustment: if the planned sprint has a share of ♣ (High) items above the team's historical average, the UI warns and recommends staying near `low`.
- The forecast is always shown with the disclaimer that it is a guiding statistical estimate, not a commitment.
- `errorPct = (deliveredPoints − predicted) / predicted × 100`. The forecast is recorded at sprint activation and compared at close.

### Estimation indicators (`computeEstimationIndicators`)

First-round consensus rate, Fibonacci frequency distribution, high-divergence items (distance of 3 or more positions in round 1, or 3 or more rounds to converge) and the dominant-suit × `estimateExceeded` matrix.

## Policy

`can(actor, action, ctx)` is a pure function implementing the permission matrix in the [product PRD](../prd/product.md#permission-matrix-can). Actions include `hostRoom`, `revealRound`, `setFinalEstimate`, `manageQueue`, `updateRoomSettings`, `transferHost`, `viewDashboard`, `exportTeamData`, `manageTeam`, `configureSprints`, `manageInstance`.

### Locked decisions

These readings are enforced by tests. Treat them as part of the contract.

**Policy and room**

- A room-mode Observer never votes. A team-role `observer` who entered as Voter still votes, can `viewDashboard` and cannot `exportTeamData`.
- `hostRoom` is true for SuperAdmin, Team Admin, PM and PO without being the current host. For Dev, QA and team-role observer it requires `isHost` or `isFacilitator`. For a guest it requires `actorCreatedRoom` or `isHost`.
- `revealRound`, `setFinalEstimate` and `manageQueue` require `isHost` or `isFacilitator`. `updateRoomSettings` and `transferHost` require `isHost`.
- Nicknames are trimmed before the 1..30 check, reject control characters with `VALIDATION` (they are not stripped) and compare with `toLocaleLowerCase("pt-BR")`, so accents stay distinct.
- Defaults: `maxParticipants` must be exactly 30, suit-axis label key `risk`, axis on, `autoReveal` off, `showAverage` on, `allowObserverComments` false, `timerSeconds` null.
- Auto-transfer takes an injected `now`, fires only when host age is greater than 60 s, treats 45 s as online and skips offline facilitators. Candidate order: facilitator (earliest `joinedAt`), then `pm > po > dev > qa > observer`, then earliest `joinedAt`. It emits `host.transferred` with reason `auto` or `manual`.
- Manual transfer and delegation need the current host and an online target (`FORBIDDEN` when offline or not host, `NOT_FOUND` when unknown). A later `delegateFacilitator` clears the previous facilitator.
- `join` with an existing `guestSessionId` or `userId` reuses that seat. `rejoin` with neither returns `VALIDATION`; an unknown session returns `NOT_FOUND`.
- Guest rooms use `teamId: null`; a team room without `teamId` is `VALIDATION`. Closing is host-only, and a closed room rejects join, settings and transfer with `FORBIDDEN`.
- `Participant.mode` is `voter | observer`; `afk` is a separate flag. `RoomBuilder` requires id, code, name, scale, host and `now` from the caller.

**Scales, cards, suits**

- Deck cards are the numeric Fibonacci labels only (`½` is `0.5`). `?`, `Coringa`, `AFK` are valid votes but not deck entries.
- `only` rejects any label outside the canonical 12; `without` ignores unknown labels. `scale.distance` is the absolute active-scale gap and is `null` for specials or missing labels.
- `isValidVote(scale, label, null)` stores the joker suit. `parseSuit` accepts only `clubs|hearts|spades|diamonds|joker`; `parseFigureTag` only `A|K|Q|J`.
- Suit ordinals: clubs 4, hearts 3, spades 2, diamonds 1, joker `null`. Label keys `suits.clubs|hearts|spades|diamonds|joker`; pt-BR labels `♣ Alto`, `♥ Médio`, `♠ Baixo`, `♦ Insignificante`, `Coringa`.
- `specialCounts` keys are the three special card labels. `suitDistribution` counts only numeric, non-joker suits. An empty numeric result uses `null` for mean, median, min and max. Extreme id lists are sorted and empty when min equals max.

**Item, round, vote**

- Displacing the current item returns it to `pending`, keeping its rounds and votes. `setCurrent` reuses an existing `voting` round, otherwise opens round `n+1`, and is `VALIDATION` on an `estimated` item.
- Only `newRound` returns `estimated` to `current`, and it keeps `finalEstimate`. `newRound` while the latest round is `voting`, a second `reveal`, and `setFinalEstimate` while the latest round is `voting` are all `VALIDATION`.
- The first final estimate has no audit; the same label again is not an audit; a real change returns an `EstimateAudit` with the injected `Date` and `from`/`to` labels. `finalSuit` is a suit kind or `null` on a tie.
- Retracting with no vote is `NOT_FOUND`. `shouldAutoReveal(now)` does not mutate, ignores `timerEndsAt` and is false when no online non-AFK voter remains.
- Event `version` copies `room.version`; `at` is `now.toISOString()`. Comments appear only on `ownVote`; revealed `votes[]` omit them. Screen `permissions` are all false. A guest-host projection uses `actorCreatedRoom: true`, everyone else `false`.
- `item.teamId` is null or equal to `room.teamId`. URL schemes are case-insensitive. `rehydrate` rejects two `current` items, two `voting` rounds on one item and a duplicate `(roundId, participantId)` vote.
- `projectRoomForViewer` lives in `packages/application/src/projections/room-view.ts`.

**Application use cases**

- `CastVote` follows `shouldAutoReveal`: the last online non-AFK voter reveals the round even when other eligible voters are offline. A single vote does not reveal while another online non-AFK voter has not voted, or when nobody eligible is online. `timerEndsAt` at epoch 0 never reveals by itself.
- `CreateRoom` and `JoinRoom` persist `sha256` of the raw token, never the raw token. `RemoveItem` deletes a pending item from the queue and the room item list.
- Purge logs a numeric `count` and no nickname. A guest room idle 59 minutes stays; idle 61 minutes with nobody online is deleted; one with newer `lastActivityAt` stays even if nobody is online; a second purge deletes nothing; a team room stays.
- `deleteExpiredAnonymous` returns the number of guest rooms it removed.

**History**

- `HistoryEntry` has no votes, participant, nickname or comment. A team room writes the aggregate rows on `SetFinalEstimate`; a guest room writes none.
- `EditFinalEstimateWithAudit` (for example 13 to 8) records the user id and injected clock while the round mean stays.
- `can(setFinalEstimate)` stays host or facilitator only, so a PM or PO who is neither does not edit history. A closed sprint rejecting the edit waits for the sprint slice.
