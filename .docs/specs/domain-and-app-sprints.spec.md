# Spec: `domain-and-app-sprints` — Sprint lifecycle, working days, capacity, commitment, delivery, carry-over, and holidays

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `domain-and-app-sprints` |
| **Release** | `R3` |
| **Priority** | `M` (`RF-75` holidays are `S`) |
| **Dependencies** | `aggregated-history-and-audit` |
| **Requirements** | `RF-70`–`RF-75`, `INV-10`, `INV-11`, `INV-12`, §5.2 and §5.3 of requirements |
| **Packages** | `@fibonaipe/domain` pure math, `@fibonaipe/application` use cases, Postgres tables |

### Perspectives

- **SA:** A sprint moves `planned → active → closed`. Closed metrics are immutable. Points are whole: done items count in the sprint where they finish; unfinished items count 0 and return to the backlog as carry-over.
- **UX:** Capacity totals shown in the UI must equal `computeCapacity`. Closing a sprint is an explicit confirm because it cannot be undone.
- **TA:** Date math uses UTC dates injected as `Date` or ISO date strings. No `Date.now` in domain. Working days are Monday–Friday minus team holidays that fall on weekdays.

---

## Functionalities & Core Capabilities

1. **`Sprint` aggregate and `SprintBuilder`.** Fields: `id`, `teamId`, `name`, `startDate`, `endDate`, `goal`, `status`, `committedPoints` (null until active), `deliveredPoints` (null until closed), `frozenMetrics` (null until closed). `startDate <= endDate`. Name required. Goal optional. Same team sprints must not overlap dates (`VALIDATION`).
2. **Transitions.** `activate(now)` only from `planned`. `close(now)` only from `active`. Any mutation of items, capacity, or dates on `closed` returns `FORBIDDEN` (`INV-10`).
3. **`computeWorkingDays(start, end, holidays)`.** Inclusive range, weekdays only, subtract holidays whose date falls on a weekday. A holiday on Saturday does not reduce the count.
4. **`computeCapacity(entries, workingDays)`.** Per person: `availableDays = max(0, workingDays - absenceDays)`, `capacity = availableDays * focusPct / 100`. `focusPct` must be 0–100, default 100. Total is the sum. Reference vector: sprint 2026-11-02 (Monday) through 2026-11-13 (Friday), holiday on 2026-11-02 → 9 working days. Person A absence 1 focus 80 → 6.4. Person B absence 0 focus 100 → 9. Total 15.4.
5. **Linking items.** An item belongs to at most one non-closed sprint (`INV-11`). Linking after `activate` does not change `committedPoints`; the item is flagged `addedAfterStart`.
6. **Commitment snapshot.** On `activate`, `committedPoints` is the sum of numeric final estimates of items linked at that moment. Items without a numeric estimate contribute 0 and are listed in `unestimated`.
7. **Delivery.** `markDone` sets `doneAt`. On `close`, `deliveredPoints` is the sum of numeric final estimates of items done (`INV-12`). Not-done items: points 0, `sprintId` cleared, `carriedOver = true`. Optional `estimateExceeded` boolean on done items.
8. **`SprintReport`.** `{ committed, delivered, addedAfterStart, carryOver[], unestimated[], capacityTotal, pace }`. `pace = delivered / capacityTotal` when capacity is > 0; otherwise pace is null and the sprint is flagged ineligible for forecast later.
9. **Holidays.** `Holiday { teamId, date, name }` CRUD behind `can(configureSprints)`.
10. **Authorization.** Configure sprints: SuperAdmin, TeamAdmin, PM. PO does not configure capacity (matrix §3). Read is anyone who can `viewDashboard`.

---

## Use Cases & Scenarios

### UC-1 — Working days and capacity vector

**Given** the November 2026 vector above, **when** `computeWorkingDays` and `computeCapacity` run, **then** working days are 9 and total capacity is 15.4. **Given** absence larger than working days, **then** available days are 0, not negative. **Given** `focusPct` 120, **then** `VALIDATION`. **Given** a range that crosses a year boundary, **then** weekdays are still counted correctly.

### UC-2 — Activate, add scope, close

**Given** items of 5 and 8 linked before activate, **when** activate runs, **then** `committedPoints` is 13. **When** an item of 3 is linked afterward and marked done, **then** committed stays 13, `addedAfterStart` includes 3, and delivered includes 3 if it is done. **When** the 8-point item is not done, **then** delivered excludes it, it returns to the backlog with `carriedOver`, and a second open sprint can link it. Linking it to two open sprints returns `VALIDATION`.

### UC-3 — Closed is frozen

**Given** a closed sprint, **when** any of activate, link, markDone, or setCapacity is called, **then** `FORBIDDEN` and stored metrics match the report captured at close.

### UC-4 — Overlap

**Given** an active sprint covering 1–14 March, **when** another sprint is created for 10–20 March for the same team, **then** `VALIDATION`. A different team may use those dates.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

Use cases: `CreateSprint`, `SetCapacity`, `ManageHolidays`, `LinkItemsToSprint`, `UnlinkItem`, `MarkItemDone`, `ActivateSprint`, `CloseSprint`, `GetSprintReport`.

`CloseSprint` success returns `SprintReport` and persists `forecast_records` as an empty shell only if the forecasting spec owns that insert. This spec creates the table `forecast_records` empty-ready (nullable prediction columns) so R4 does not rewrite R3 migrations, but it does not compute a forecast.

Errors: `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`.

---

## Flow & states

```text
planned → active → closed
```

Illegal edges return `Result.err` without writes. Capacity edits are allowed in `planned` and `active` and forbidden in `closed`. Commitment snapshot is taken once, at the planned→active edge.

---

## Technical design / how-to

1. Pure functions in `packages/domain/src/sprints/working-days.ts` and `capacity.ts`. Aggregate in `sprint.ts` with `SprintBuilder`.
2. Date inputs are `YYYY-MM-DD` interpreted as civil dates in UTC to avoid timezone off-by-one. Document that the UI sends the date the user picked, not a zoned timestamp.
3. Migration `004_r3_sprints.sql`: `sprints`, `capacity_entries`, `holidays`, `sprint_items`, `forecast_records` (nullable forecast columns for R4).
4. `CloseSprint` writes `frozen_metrics` jsonb equal to `SprintReport` and sets status `closed` in one transaction.
5. Tests include the 15.4 vector, weekend holiday, month/year crossing, overlap, carry-over, and immutability.
6. No React in this spec. Screens are `sprint-and-observability-ui`.

---

## Files to touch

- `packages/domain/src/sprints/sprint.ts`
- `packages/domain/src/sprints/sprint-builder.ts`
- `packages/domain/src/sprints/working-days.ts`
- `packages/domain/src/sprints/capacity.ts`
- `packages/domain/src/sprints/sprint-report.ts`
- `packages/domain/src/sprints/*.test.ts`
- `packages/application/src/use-cases/sprints/*.ts`
- `packages/adapter-persistence-postgres/migrations/004_r3_sprints.sql`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| 2026-11-02 to 2026-11-13, holiday 11-02 | working days | 9 |
| A 1 day off at 80%, B full | capacity | 6.4 and 9, total 15.4 |
| Weekend holiday | working days | unchanged vs no holiday |
| focusPct 120 | set capacity | `VALIDATION` |
| Two items 5 and 8 | activate | committed 13 |
| Item added after start and done | close | committed unchanged, counts in delivered and addedAfterStart |
| Undone item | close | 0 points, carriedOver, sprintId null |
| Closed sprint | link item | `FORBIDDEN` |
| Overlapping dates same team | create | `VALIDATION` |
| Item on two open sprints | link | `VALIDATION` |

**QA-red:** vector tests fail. **SE-green:** domain and use cases. **QA-verify:** contract test on new repositories against Postgres.
