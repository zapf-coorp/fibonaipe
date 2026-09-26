# Spec: collection-manager

## 1. Overview

User-owned copy counts per card and automatic computation of cards missing to complete the selected deck (required vs owned).

## 2. User Stories

- As a user, I record how many copies of each card I own.
- As a user, I see which cards I still need to finish my selected deck.
- As a user, missing list updates when I change ownership or deck composition.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CM-1 | Set owned count for a card id to an integer ≥ 0 (via detail, collection list, or quick control). |
| FR-CM-2 | Collection area lists cards with owned counts (at least those owned > 0 and/or referenced by decks). |
| FR-CM-3 | For selected deck, compute missing: for each card id, `missing = max(0, requiredQuantity - ownedQuantity)`. |
| FR-CM-4 | Present missing cards as a list/grid with required, owned, and missing quantities. |
| FR-CM-5 | “Complete” state when all missing quantities are 0. |
| FR-CM-6 | Persist ownership via db-setup. |
| FR-CM-7 | Pure calculation function must be unit-tested (no UI required for the math). |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-CM-1 | Recompute missing cards synchronously for typical decks (< 100 unique cards). |
| NF-CM-2 | UI in pt-BR (e.g. “Faltam”, “Possui”, “Necessário”). |
| NF-CM-3 | Essential tests for ownership updates and missing-card matrix edge cases (zero owned, partial, complete, cards not in collection). |

## 5. Acceptance Criteria

1. Set owned=2 for a card required×3 → missing shows 1.
2. Owned ≥ required → that card absent from missing list (or missing=0 and marked complete).
3. Changing deck quantity updates missing without reload.
4. Reload preserves owned counts.
5. Automated tests cover missing-card calculation.

## 6. Open Questions

- Whether collection browser shows entire catalog or only owned/deck-related cards.
- Treat Energy missing the same as other cards — yes for v1.
