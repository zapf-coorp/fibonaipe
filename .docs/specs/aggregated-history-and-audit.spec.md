# Spec: `aggregated-history-and-audit` — Strictly aggregated history, estimate audit, search, and CSV/JSON export

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `aggregated-history-and-audit` |
| **Release** | `R2` |
| **Priority** | `M` (`RF-62` and `RF-65` are `S`) |
| **Dependencies** | `auth-teams-and-claiming`, `domain-item-round-vote` |
| **Requirements** | `RF-60`–`RF-65`, `INV-09`, `INV-13`, `RNF-14` |
| **Packages** | domain record type, application recorder, Postgres `history_entries` and `estimate_audits`, history UI |

### Perspectives

- **SA:** Team and claimed rooms persist one row per round of aggregates plus the final estimate. Individual votes and comments are never inserted. Guest rooms never call the recorder.
- **UX:** History is a filterable table. Observers can read and cannot export. Editing a final estimate shows who changed it and when.
- **TA:** The write path builds a `HistoryEntry` in memory from `RoundStats` and inserts that object only. A database test queries `votes` joined to history and expects zero new vote rows from the recorder. Export reuses `adapter-exporter-csvjson`.

---

## Functionalities & Core Capabilities

1. **`HistoryEntry` value.** `id`, `teamId`, `itemId`, `roomId`, optional `sprintId`, `title`, optional `externalKey`, optional `figureTag`, `roundNumber`, `mean`, `median`, `modes`, `min`, `max`, `consensus`, `nearConsensus`, `suitDistribution`, `suitDivergence`, `specialCounts`, `finalEstimate`, optional `finalSuit`, `estimatedAt`. No `participantId`, no card list, no comment.
2. **`RecordAggregatedHistory`.** Invoked when a final estimate is set on a team room or a claimed room. Writes one entry per round already revealed, plus the final estimate on the latest entry (or a sibling column). Guest rooms return without writing (`INV-13`).
3. **`EditFinalEstimateWithAudit`.** Allowed when `can` permits `setFinalEstimate` for a team member who is host-equivalent on history (TeamAdmin, PM, PO, or the original facilitator rule: TeamAdmin, PM, PO). Updates the final estimate and appends `EstimateAudit` `{ from, to, changedBy, at }`. Does not rewrite round aggregates.
4. **Search.** Filters: text on title, date range, sprint, room, estimate min/max, suit level, figure tag. Pagination with stable sort by `estimatedAt` descending. Observers get the same rows and `exportTeamData` is false.
5. **Export.** CSV and JSON of the current filter only, via `Exporter`, with the same formula-injection prefix rule. File name includes the team and the date.
6. **Account deletion interaction.** If a user id would have appeared on an audit, the display name resolves through a lookup that returns the i18n key `participant.removed` when the user row is gone. Audits store `changedBy` as user id; the UI translates a missing user. Votes are still not stored, so there is no per-vote authorship to scrub.

---

## Use Cases & Scenarios

### UC-1 — Team room records aggregates only

**Given** a team room with two rounds and votes from three people, **when** the facilitator sets the final estimate, **then** `history_entries` has two rows of stats and the `votes` table is unchanged by the recorder (session votes may still exist on the live room until purge rules, but the history insert statement's column list has no vote payload). A SQL assertion reads the inserted JSON/row and fails if a nickname or participant id is present.

### UC-2 — Guest room writes nothing

**Given** a guest room with a final estimate, **when** the same use case is invoked, **then** the history table count is unchanged. The participant can still download the session summary from R1.

### UC-3 — Edit and export the filter

**Given** 40 history rows and a filter "estimate ≥ 8" matching 3 rows, **when** the user exports CSV, **then** the file has 3 data rows plus header, matching the table. **When** an observer calls export, **then** `FORBIDDEN`. **When** an editor changes 13 to 8, **then** an audit row stores from `13`, to `8`, the user id, and the UTC time, and the round mean stays the original value.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

`RecordAggregatedHistory` input: `{ roomId, itemId, actorId }`. Success: `{ entryIds: string[] }`. Errors: `NOT_FOUND`, `FORBIDDEN`.

`ListHistory` input: filters plus `cursor` and `limit` (max 100). Success: `{ rows, nextCursor }`.

`EditFinalEstimateWithAudit` input: `{ entryId or itemId, toCard, actorId }`. Errors: `VALIDATION` if `toCard` is special, `FORBIDDEN` if closed sprint later owns the item (enforced fully in the sprint spec; this spec rejects unknown items).

---

## Flow & states

History screen states: `loading`, `empty`, `results`, `error`. Filters apply on submit or after a short debounce, one request at a time. Export button disabled while `exporting`. Edit dialog is the only overlay; opening it closes the filter sheet on a 360px layout.

Empty copy explains that guest rooms are not stored and points to session export.

---

## Technical design / how-to

1. Build `HistoryEntry` with a builder that has no `votes` field, so adding one is a type error.
2. Migration `003_r2_history.sql`: `history_entries`, extend `estimate_audits` if R1 created it with a nullable `team_id`. Index `(team_id, estimated_at desc)`.
3. Recorder runs in the same transaction as `SetFinalEstimate` for team rooms, after commit of the estimate, still inside the room lock. It reads rounds and calls `computeRoundStats` if stats were not already stored on the round row. Prefer storing the aggregate on the round at reveal time so the recorder copies numbers and does not need vote rows. Implementation choice: at `RevealRound` for team rooms, persist `rounds.stats_json` (aggregates only). The recorder copies `stats_json`. Vote rows may remain in the live room for the session and are not copied.
4. UI: `apps/web/src/routes/teams.$id.history.tsx`. Table with sortable headers announced via `aria-sort`. Pagination button, not infinite scroll, so the end is reachable by keyboard.
5. Tests: repository test that inserts via the use case and selects the row; snapshot of CSV; observer export 403.

---

## Files to touch

- `packages/domain/src/history/history-entry.ts`
- `packages/domain/src/history/history-entry-builder.ts`
- `packages/application/src/use-cases/history/record-aggregated-history.ts`
- `packages/application/src/use-cases/history/edit-final-estimate.ts`
- `packages/application/src/use-cases/history/list-history.ts`
- `packages/adapter-persistence-postgres/migrations/003_r2_history.sql`
- `apps/web/src/routes/teams.$id.history.tsx`
- `apps/web/e2e/history.spec.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Team room, 2 rounds | set final estimate | 2 aggregate rows, no participant id column populated |
| Guest room | set final estimate | history count unchanged |
| Filter matches 3 of 40 | export CSV | 3 rows |
| Observer | export | `FORBIDDEN` |
| Change 13 → 8 | edit | audit from/to/who/when; mean unchanged |
| Special card as new final | edit | `VALIDATION` |
| Inserted row JSON | scan | no nickname, comment, or per-person card |

**QA-red:** builder test forbids vote lists and a use-case test for guest skip. **SE-green:** persistence and UI. **QA-verify:** export matches filter in e2e.
