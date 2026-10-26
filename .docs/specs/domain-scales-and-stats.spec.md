# Spec: `domain-scales-and-stats` — Fibonacci scale builder, Suit hierarchy, special cards, figure tags, and pure `computeRoundStats`

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `domain-scales-and-stats` |
| **Release** | `R1` — PlanITPoker parity + Fibonacci & risk suits |
| **Priority** | `M` |
| **Dependencies** | `monorepo-foundation` |
| **Requirements** | `RF-44`, `RF-47`, `RF-48`, `RF-51`, `RF-52`, `RF-54`, `RF-56`, `INV-06`, §5.1 |
| **Packages** | `@fibonaipe/domain` only. Zero runtime dependencies. |

### Perspectives

- **SA:** Value objects and a pure stats function are the single source of truth for points, suits, special cards, and round math. UI and adapters never reimplement these formulas.
- **UX:** Stats expose flags the table can render without guessing: `consensus`, `nearConsensus`, `suitDivergence`, `extremes`, `specialCounts`. Display rounding stays in the UI (mean 1 decimal, points integer or `½`).
- **TA:** Private constructors plus `ScaleBuilder`. All functions are pure, permutation-invariant, and free of `Date` and `Math.random`.

---

## Functionalities & Core Capabilities

1. **`ScaleBuilder` (constructor pattern).** Canonical Fibonacci sequence is `0, ½, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89`. `ScaleBuilder.fibonacci()` starts from that set. `without(...)` and `only(...)` drop cards the team does not use. `build()` returns `Result<Scale, AppError>`. A scale must keep at least two numeric cards. Labels are unique.
2. **`Card` value object.** Fields: `label` (display string), `numeric` (`number | null`), `kind` (`numeric` | `special`). Half-point is the number `0.5`, label `½`.
3. **`Suit` value object.** Ordinal map: `♦ Ouros = 1` Insignificante, `♠ Espadas = 2` Baixo, `♥ Copas = 3` Médio, `♣ Paus = 4` Alto, `Coringa = null` (abstention on the suit axis). Every suit carries a stable i18n key and a visible text label. Color is never the only signal.
4. **Special cards that never enter numeric stats.** `?` (doubt), `Coringa` (full abstention when used as the card), `AFK` (absent, vote void). They increment `specialCounts` only.
5. **Figure tags `A`, `K`, `Q`, `J`.** Item-level labels, not votes. Default meanings are configurable later by the team (`Feature`, `Bug`, `Tech Debt`, `Spike`). This spec only defines the closed set and validation.
6. **`isValidVote(scale, card, suit)`.** A vote is valid when the card belongs to the room scale or is a special card, and the suit is one of the five suit values. A numeric vote with no suit is stored as suit `Coringa` (number counts, suit abstains) per `RF-51`.
7. **`indexOf` and `distance`.** Position of a numeric label on the active scale. `distance('5','8')` on full Fibonacci is `1`. Special cards have no distance.
8. **`computeRoundStats(scale, votes): RoundStats`.** Pure. Inputs are already-cast votes `{ participantId, card, suit }`. Output:
   - `voteCount` — numeric votes only.
   - `mean`, `median`, `modes`, `min`, `max` — numeric only. No internal rounding.
   - Median of an even count is the arithmetic mean of the two central values.
   - `modes` is the sorted list of values with the highest frequency, empty when every frequency is 1.
   - `consensus` is true when there are at least 2 numeric votes and min equals max.
   - `nearConsensus` is true when consensus is false, there are at least 2 numeric votes, and scale distance between min and max is at most 1.
   - `extremes` lists participant ids of min and max when min differs from max.
   - `specialCounts` counts `?`, `Coringa`, `AFK`.
   - `suitDistribution` counts each suit among numeric votes that chose a real suit (Coringa excluded from divergence).
   - `suitDivergence` is true when `(maxSuitOrdinal - minSuitOrdinal) >= 2`.

---

## Use Cases & Scenarios

### UC-1 — Team trims the Fibonacci deck

**Given** the canonical scale, **when** the host builds a scale `without('0','½','34','55','89')`, **then** `build()` succeeds and `isValidVote` rejects `0` and `34` and accepts `5` and `8`. **When** the builder is left with a single numeric card, **then** `build()` returns `VALIDATION`.

### UC-2 — Mixed round statistics

**Given** votes `[3, 5, 5, 8]`, **then** mean is `5.25`, median `5`, modes `[5]`, min `3`, max `8`, consensus false, near-consensus false. **Given** `[5, 5, 5]`, consensus is true. **Given** `[3, 5]` on Fibonacci, near-consensus is true. **Given** `[5, ?, Coringa-card]`, numeric count is 1, consensus is false, `specialCounts` records one `?` and one `Coringa`. Empty input yields `voteCount = 0` and null numeric fields. Reordering the same votes does not change the result.

### UC-3 — Hidden risk split

**Given** two votes both `5`, one `♣ Paus` and one `♠ Espadas`, **then** numeric consensus is true and `suitDivergence` is true (ordinal gap `4 - 2 = 2`). **Given** `5♥` and `5♣`, gap is `1`, so `suitDivergence` is false. Suit `Coringa` is ignored in the gap. `AFK` does not enter mean or suit distribution.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

| Type | Contract |
| :--- | :--- |
| `Scale` | Immutable. `id`, `name`, ordered `cards[]`. Built only via `ScaleBuilder.build()`. |
| `Suit` | Closed union `clubs \| hearts \| spades \| diamonds \| joker` plus `ordinal: 4\|3\|2\|1\|null` and `labelKey`. |
| `FigureTag` | Closed union `A \| K \| Q \| J`. |
| `RoundStats` | All fields listed above. `modes` sorted ascending. `extremes.minIds` and `extremes.maxIds` sorted by participant id for stability. |
| Errors | `VALIDATION` when scale is too small, labels duplicate, vote card is outside the scale, or suit is unknown. |

No HTTP codes in this package. Application maps `AppError` later.

---

## Flow & states

This spec has no screen. The data flow is:

1. Room settings choose an active `Scale` (built once, stored with the room).
2. While `Round.status = voting`, votes accumulate but are not projected to other viewers.
3. On reveal, application calls `computeRoundStats` once and attaches the result to the revealed snapshot.
4. UI reads flags. It does not recompute mean or suit gap.
5. A new round does not mutate previous `RoundStats`. Each round keeps its own aggregate.

---

## Technical design / how-to

1. Place types in `packages/domain/src/scales/` (`card.ts`, `suit.ts`, `scale.ts`, `scale-builder.ts`, `figure-tag.ts`) and stats in `packages/domain/src/stats/compute-round-stats.ts`.
2. `Scale` and `Suit` use private constructors. `ScaleBuilder` is the only factory. Methods are chainable and `build()` is the validation gate (`Result`).
3. Represent `½` as `0.5` internally and as the label string `½` at the boundary. Sorting and median use the numeric value.
4. Compute mean as `sum / count` with no `toFixed`. Median: sort a copy, never the input. Modes: frequency map, then filter max frequency, then sort.
5. Suit divergence: collect ordinals where suit is not joker and the card is numeric, then compare max and min. Fewer than two real suits means `suitDivergence = false`.
6. Export a single barrel from `packages/domain/src/index.ts`. Do not import application, adapters, React, or Node APIs.
7. Tests live next to the module (`*.test.ts`) and use table-driven vectors plus `fast-check`: `min <= median <= max` when defined, `min <= mean <= max`, and invariance under permutation of votes.

---

## Files to touch

- `packages/domain/src/scales/card.ts`
- `packages/domain/src/scales/suit.ts`
- `packages/domain/src/scales/scale.ts`
- `packages/domain/src/scales/scale-builder.ts`
- `packages/domain/src/scales/figure-tag.ts`
- `packages/domain/src/scales/validate-vote.ts`
- `packages/domain/src/stats/compute-round-stats.ts`
- `packages/domain/src/stats/compute-round-stats.test.ts`
- `packages/domain/src/scales/scale-builder.test.ts`
- `packages/domain/src/index.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Full Fibonacci | `distance('5','8')` | `1` |
| Custom scale with 1 numeric card | `build()` | `VALIDATION` |
| Votes `[3,5,5,8]` | `computeRoundStats` | mean `5.25`, median `5`, modes `[5]`, min `3`, max `8` |
| Votes `[5,5,5]` | stats | `consensus = true` |
| Votes `[3,5]` | stats | `nearConsensus = true` |
| Votes `[5, ?, Coringa]` | stats | `voteCount = 1`, specials counted, no consensus |
| Votes `5♣` and `5♠` | stats | consensus true and `suitDivergence` true |
| Same votes shuffled | stats | deep-equal result |
| `domain` importing React or `Date.now` | `npm run verify` | boundary check fails |

**QA-red:** write the table tests and one property test; confirm they fail. **SE-green:** implement builder and stats until they pass. **QA-verify:** `npm run verify` green, coverage of this module included in the domain 90% gate.
