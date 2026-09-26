# Spec: deck-analysis

## 1. Overview

Per-deck statistics that help the user understand composition: energy/type distribution, rarity counts, and cost curve (or equivalent cost metric from card data).

## 2. User Stories

- As a user, I open a deck and immediately see type/energy mix and cost curve.
- As a user, stats update when I add or remove cards.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-DA-1 | Aggregate counts by Pokémon type / energy identity available on cards. |
| FR-DA-2 | Aggregate counts by rarity. |
| FR-DA-3 | Build a cost curve histogram from converted cost / retreat / attack cost proxy — use the best numeric cost field the API provides; document the field chosen. |
| FR-DA-4 | Show total cards and unique cards. |
| FR-DA-5 | Stats view is available from the deck surface without a multi-step wizard. |
| FR-DA-6 | Recompute when deck composition changes. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-DA-1 | Computation is pure/local and unit-testable. |
| NF-DA-2 | Charts/visuals remain readable on mobile (simplify to stacked bars/lists if needed). |
| NF-DA-3 | Labels in pt-BR. |

## 5. Acceptance Criteria

1. A deck with known mixed types shows matching type totals (weighted by quantity).
2. Rarity buckets sum to total card count.
3. Cost curve buckets sum to total cards that have a cost value; cards without cost are counted in an “N/D” or excluded bucket (documented).
4. Adding a card updates stats without full app reload.

## 6. Open Questions

- Which API field is the canonical “cost” for TCG cards (convertedRetreatCost, attack costs, etc.).
- Include Trainer/Energy in type chart or separate series.
