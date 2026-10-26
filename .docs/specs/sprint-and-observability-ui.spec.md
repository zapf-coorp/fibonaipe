# Spec: `sprint-and-observability-ui` — Sprint screens, capacity grid, charts, vote comments, figure tags, and estimation indicators

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `sprint-and-observability-ui` |
| **Release** | `R3` |
| **Priority** | `M` (`RF-50` and `RF-83` are `C`/`S`) |
| **Dependencies** | `domain-and-app-sprints`, `poker-table-and-projector-ui`, `aggregated-history-and-audit` |
| **Requirements** | `RF-50`, `RF-56`, `RF-70`–`RF-75`, `RF-80`, `RF-81`, `RF-83`, `RNF-08`, `RNF-09` |
| **App** | `apps/web` routes under the team |

### Perspectives

- **SA:** Charts read the same `SprintReport` series as the tables. Indicators are pure functions over aggregated history, not over individual votes.
- **UX:** Each SVG chart has an HTML table twin. Series use label plus pattern, not color alone. Closing a sprint is a confirm dialog and then a read-only report. Fewer than three closed sprints shows an empty state that still plots whatever exists and does not pretend to forecast (forecast copy belongs to the next spec).
- **TA:** Hand-rolled SVG components. No chart library, to protect the bundle and accessibility. Vote comments exist only on the live round and are omitted from history writes.

---

## Functionalities & Core Capabilities

1. **Sprint list and form.** Name, start, end, goal. Dates formatted with `Intl`. Validation errors from overlap and `start > end` sit on the fields.
2. **Capacity grid.** One row per member: absence days and focus percent. Total updates from `computeCapacity` (server value shown after save; client may preview with the same pure function imported from domain). Holiday calendar: add and remove team holidays.
3. **Scope linking.** Pick estimated history items. Show running committed total. After activation, newly linked items are badged `added after start`.
4. **Delivery.** Mark done, optional "estourou a estimativa". Close button opens one confirm dialog listing committed, delivered, carry-over, and unestimated. After close, controls are disabled with an explanation.
5. **Velocity chart.** Per sprint, bars or points for committed vs delivered, plus added-after-start if non-zero. Table twin with the same numbers.
6. **Capacity chart.** Person-days and adjusted capacity per sprint, plus pace. Table twin.
7. **`computeEstimationIndicators`.** Over a team and period: consensus rate = rounds with consensus / revealed rounds; histogram of final Fibonacci values; high-divergence items where the first round's scale distance between min and max is ≥ 3 or the item took ≥ 3 rounds to close; matrix of final suit (or predominant suit stored on the aggregate) vs `estimateExceeded` counts. Each divergent item links to its history row.
8. **Vote comment (`RF-50`).** Optional 140-character field on the deck, visible only after reveal, escaped as text. Observers comment only if `allowObserverComments` is on. The leak test from R1 extends to comments: before reveal, other clients do not receive the comment. History recorder still drops comments.
9. **Figure tag meanings (`RF-56`).** Team settings map `A`, `K`, `Q`, `J` to labels. The queue and history show the letter and the label.

---

## Use Cases & Scenarios

### UC-1 — Plan, activate, deliver, close

**Given** a PM on a 360px screen, **when** they create a sprint, set capacity, link two items, activate, mark one done, and confirm close, **then** the report matches `GetSprintReport` and the form becomes read-only.

### UC-2 — Charts and table stay in lockstep

**Given** three closed sprints, **when** the dashboard renders, **then** each chart series has a text name in the legend and the table below contains the same committed, delivered, and capacity figures. Keyboard can move focus across points and hear the value.

### UC-3 — Comment does not leak or persist

**Given** voter A comments "depende do fornecedor", **when** B fetches state before reveal, **then** the comment is absent. **After** reveal, B sees the text. **When** the item is saved to history, **then** the history row has no comment field.

### UC-4 — Divergence list

**Given** a first round with distance 4 on the scale, **when** indicators load, **then** the item appears on the high-divergence list and the link opens its history entry.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

`computeEstimationIndicators(entries, scale): Indicators` is pure in domain.

Chart props: `{ points: SprintReport[], labelKeys }`. They render SVG and a `<table>` with `<caption>` and `<th scope>`.

Comment command extends `CastVote` with optional `comment`. Projector and other voters still follow `projectRoomForViewer` rules.

---

## Flow & states

Sprint screen states: `list`, `editing-planned`, `active`, `confirm-close`, `closed`. `confirm-close` is the only modal. Closed has no path back to editing.

Dashboard states: `loading`, `no-sprints`, `has-sprints`. `no-sprints` explains how to close a sprint. It does not show a forecast number.

Comment field states: `hidden` (observer without permission), `editing` (voting), `sealed` (revealed, read-only text).

---

## Technical design / how-to

1. Import `computeCapacity` and `computeEstimationIndicators` from `@fibonaipe/domain` into the web app only as pure functions. The displayed total after save comes from the API so a stale client cannot disagree once the server responds.
2. SVG components `VelocityChart`, `CapacityChart` under `apps/web/src/features/sprints/charts/`. Include `<title>` and `<desc>`. Points are `<a>` or buttons with `aria-label`.
3. Do not add a chart dependency. CSS for patterns (solid vs dashed stroke) in addition to the token colors.
4. Extend vote projection tests for comments. Extend history builder tests to ignore comment if a caller passes one.
5. Routes: `/teams/:id/sprints`, `/teams/:id/sprints/:sprintId`, `/teams/:id/dashboard`.
6. i18n and axe on both themes at 360 and 1280. Manual notes appended to `docs/a11y/R3.md`.

---

## Files to touch

- `packages/domain/src/stats/estimation-indicators.ts`
- `packages/domain/src/stats/estimation-indicators.test.ts`
- `packages/application/src/projection/project-room-for-viewer.ts` (comment visibility)
- `apps/web/src/features/sprints/SprintForm.tsx`
- `apps/web/src/features/sprints/CapacityGrid.tsx`
- `apps/web/src/features/sprints/CloseSprintDialog.tsx`
- `apps/web/src/features/sprints/charts/VelocityChart.tsx`
- `apps/web/src/features/sprints/charts/CapacityChart.tsx`
- `apps/web/src/features/planning/CommentField.tsx`
- `apps/web/src/routes/teams.$id.sprints.tsx`
- `apps/web/src/routes/teams.$id.dashboard.tsx`
- `apps/web/e2e/sprints.spec.ts`
- `docs/a11y/R3.md`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Capacity inputs of the reference vector | grid shows total | 15.4 |
| Close confirmed | report | matches server `SprintReport` |
| Closed sprint | edit controls | disabled with explanation |
| Chart and table | same sprint | same numbers |
| Comment before reveal | other client's state | comment absent |
| History row | after estimate | no comment stored |
| First round distance ≥ 3 | indicators | item listed and linked |
| axe | sprint and dashboard | no serious/critical issues |
| Keyboard | chart point | value announced |

**QA-red:** indicator unit tests and comment leak test. **SE-green:** screens. **QA-verify:** e2e close flow and axe.
