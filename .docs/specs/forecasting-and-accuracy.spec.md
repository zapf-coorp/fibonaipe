# Spec: `forecasting-and-accuracy` — Median pace forecast, percentile band, insufficient-data guard, accuracy, and dashboard export

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `forecasting-and-accuracy` |
| **Release** | `R4` |
| **Priority** | `M` (`RF-84` and `RF-86` are `S`) |
| **Dependencies** | `domain-and-app-sprints`, `sprint-and-observability-ui` |
| **Requirements** | `RF-82`, `RF-84`, `RF-85`, `RF-86`, §5.3 |
| **Packages** | domain `computeForecast`, application records on activate/close, dashboard UI |

### Perspectives

- **SA:** Forecast is a pure function of closed eligible sprints and a planned capacity. Fewer than 3 eligible sprints returns `insufficient_data` and the UI shows no predicted number. The number is always labeled as a statistical estimate, not a commitment.
- **UX:** Card shows predicted value, low–high band, and median pace. A warning appears when the planned sprint's share of `♣ Paus` items is above the team's historical share. Filters and export match the on-screen series. Observers do not export.
- **TA:** `ForecastReportBuilder` validates inputs and returns `Result`. Percentiles use linear interpolation. No randomness and no Monte Carlo in this spec (Monte Carlo stays post-MVP).

---

## Functionalities & Core Capabilities

1. **Eligibility.** Closed sprints with `capacityTotal > 0`. Others are ignored and listed as excluded. Sort by `endDate`.
2. **Window.** If eligible count < 3, result is `{ status: 'insufficient_data', have, need: 3 }`. Else `N = min(6, count)` using the latest N.
3. **Pace.** `deliveredPoints / capacityTotal` for each eligible sprint.
4. **Center.** `medianPace` is the median of those paces (even count: mean of the two central values). `predicted = plannedCapacity * medianPace`.
5. **Band.** If `N >= 6`, low and high paces are percentiles 25 and 75 with linear interpolation at position `p * (n - 1)`. If `3 <= N < 6`, low and high paces are min and max. Multiply by `plannedCapacity`.
6. **Reference vectors.** Paces from delivered/capacity `20/10`, `27/12`, `21/14` → `2`, `2.25`, `1.5`, median `2`. Planned capacity `15.4` → predicted `30.8`, band `23.1` to `34.65`. Delivered `28` → `errorPct ≈ -9.09`. Percentile vector paces `[1, 1.5, 2, 2.5, 3, 3.5]` → median `2.25`, p25 `1.625`, p75 `2.875`.
7. **Risk warning.** If the planned sprint's fraction of items whose stored suit is `♣` exceeds the historical fraction of closed items with suit `♣` by a documented margin (default: more than 1.5× the historical rate, and at least two clubs items), the report sets `highRiskWarning: true`. The UI tells the reader to prefer the low end of the band. This does not change `predicted` in R4, so the math stays auditable.
8. **`ForecastRecord`.** On `ActivateSprint`, create the record with the forecast at that moment or `status: insufficient_data`. On `CloseSprint`, fill `delivered` and `errorPct = (delivered - predicted) / predicted * 100` when predicted > 0. Records with `insufficient_data` stay out of the mean absolute error.
9. **`computeAccuracy`.** Series of `{ sprintId, predicted, delivered, errorPct }` and `meanAbsError` over records that have a numeric prediction.
10. **UI.** Forecast card, accuracy chart (predicted vs delivered) with table twin, always-visible disclaimer i18n string. With insufficient data, the card shows the count `have/3` and no number. Filters: team (already scoped) and period. Export CSV, JSON, and SVG (or PNG rendered from the SVG client-side) of the filtered series. Observer export is `FORBIDDEN`.

---

## Use Cases & Scenarios

### UC-1 — Three sprints produce a band from min and max

**Given** the 20/10, 27/12, 21/14 vector and planned capacity 15.4, **when** `computeForecast` runs, **then** status is `ok`, predicted is `30.8`, low `23.1`, high `34.65`. **Given** only two eligible sprints, **then** status is `insufficient_data` and `have` is 2.

### UC-2 — Six sprints use P25 and P75

**Given** the six paces `[1, 1.5, 2, 2.5, 3, 3.5]`, **when** percentiles are computed, **then** p25 is `1.625` and p75 is `2.875`. Property: `low <= predicted <= high` whenever status is `ok`.

### UC-3 — Accuracy across activate and close

**Given** activate stored predicted `30.8`, **when** close records delivered `28`, **then** `errorPct` is approximately `-9.09`. **Given** activate happened with insufficient data, **then** the record is excluded from `meanAbsError`.

### UC-4 — UI refuses a fake number

**Given** two closed sprints, **when** the dashboard renders, **then** the disclaimer and the insufficient-data message are visible and no predicted numeral is in the card. **Given** six sprints and a period filter, **when** the user exports CSV, **then** the file matches the filtered table. An observer receives `FORBIDDEN`.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

`computeForecast(closed, plannedCapacity): ForecastResult` via `ForecastReportBuilder.build()`.

`ForecastResult` is a discriminated union `ok | insufficient_data`.

`errorPct` uses the stored predicted value from activation time, not a recomputed forecast at close, so later sprints do not rewrite history.

Zero planned capacity returns `VALIDATION` rather than a divide-by-zero prediction.

---

## Flow & states

Dashboard forecast slot states: `insufficient`, `ready`, `ready-with-risk-warning`. Accuracy chart states: `empty` (no comparable records), `series`. Export states: `idle`, `preparing`, `downloaded`. Only one export runs at a time. The risk warning is inline on the card, not a second modal.

---

## Technical design / how-to

1. `packages/domain/src/forecast/median.ts`, `percentile.ts`, `compute-forecast.ts`, `forecast-report-builder.ts`, `accuracy.ts`.
2. Percentile: sort a copy ascending, index = `p * (n - 1)`, interpolate between floor and ceil.
3. Extend `ActivateSprint` and `CloseSprint` to write `forecast_records`. Migration columns already exist from `004_r3_sprints.sql`; add `005_r4_forecast.sql` only if a column is missing.
4. UI card and `ForecastChart` SVG plus table in `apps/web/src/features/forecast/`. Disclaimer is a required prop with no default empty string; the component throws in dev if the i18n string is missing so the warning cannot be omitted.
5. Export reuses `Exporter` for CSV/JSON. SVG export is the chart's `outerHTML` serialized as a file. PNG, if implemented, uses a browser `Blob` from the SVG without a native `canvas` addon (`sharp` and `node-canvas` are forbidden). If PNG cannot be done without a native addon, ship SVG only and say so in the PR. CSV and JSON remain mandatory.
6. Tests: both vectors, property `low <= predicted <= high`, insufficient path, accuracy −9.09, zero capacity, excluded zero-capacity sprint listed.

---

## Files to touch

- `packages/domain/src/forecast/compute-forecast.ts`
- `packages/domain/src/forecast/percentile.ts`
- `packages/domain/src/forecast/forecast-report-builder.ts`
- `packages/domain/src/forecast/accuracy.ts`
- `packages/domain/src/forecast/*.test.ts`
- `packages/application/src/use-cases/sprints/activate-sprint.ts`
- `packages/application/src/use-cases/sprints/close-sprint.ts`
- `packages/adapter-persistence-postgres/migrations/005_r4_forecast.sql`
- `apps/web/src/features/forecast/ForecastCard.tsx`
- `apps/web/src/features/forecast/ForecastChart.tsx`
- `apps/web/src/routes/teams.$id.dashboard.tsx`
- `apps/web/e2e/forecast.spec.ts`
- `docs/a11y/R4.md`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Three reference sprints, capacity 15.4 | forecast | 30.8 and band 23.1–34.65 |
| Two sprints | forecast | `insufficient_data`, have 2 |
| Six paces | percentiles | p25 1.625, p75 2.875 |
| Predicted 30.8, delivered 28 | error | about −9.09 |
| Insufficient activate | accuracy mean | record excluded |
| Capacity 0 sprint | forecast input | excluded and listed |
| UI with 2 sprints | render | no predicted number, disclaimer visible |
| Filtered export | CSV | same rows as the table |
| Observer | export | `FORBIDDEN` |
| Any `ok` result | property test | `low <= predicted <= high` |

**QA-red:** vector tests fail. **SE-green:** engine, records, card. **QA-verify:** e2e for 2, 3, and 6 sprints plus axe.
