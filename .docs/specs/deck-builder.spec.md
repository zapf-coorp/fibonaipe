# Spec: deck-builder

## 1. Overview

Low-friction add/remove of cards on the selected deck. Interaction budget: one or two clicks/taps for primary add and remove paths. Enforces copy limits for constructed play where applicable.

## 2. User Stories

- As a user, I add a card to my deck quickly from search or detail.
- As a user, I remove or decrease a card quantity from the deck view with minimal steps.
- As a user, I am blocked with a clear message if I exceed copy limits.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-DBU-1 | Require a selected deck (deck-core); if none, prompt to create/select before add. |
| FR-DBU-2 | Add card: increment quantity for card id (default +1) in ≤ 2 clicks/taps from result/detail. |
| FR-DBU-3 | Remove/decrease: −1 quantity; remove entry when quantity reaches 0 — in ≤ 2 clicks/taps from deck view. |
| FR-DBU-4 | Enforce max copies per non-basic-Energy card (default 4 unless ruleset Open Question changes this). |
| FR-DBU-5 | Allow unlimited basic Energy cards when identifiable from card data. |
| FR-DBU-6 | Show running total card count in the deck builder surface. |
| FR-DBU-7 | Keep deck composition visible alongside browse when layout allows (split or sticky tray on desktop). |
| FR-DBU-8 | Persist mutations immediately via db-setup. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-DBU-1 | Local mutation feedback ≤ 100 ms. |
| NF-DBU-2 | Unit tests cover increment, decrement, remove-at-zero, and copy-limit rejection. |
| NF-DBU-3 | Errors and confirmations in pt-BR. |

## 5. Acceptance Criteria

1. From search with a deck selected, add succeeds in ≤ 2 taps and quantity appears in deck.
2. Decreasing to zero removes the line item.
3. Attempting a 5th copy of a limited card is rejected with a clear message; deck unchanged.
4. Basic Energy can exceed 4 copies when classified as basic Energy.
5. Tests exist for deck mutation rules.

## 6. Open Questions

- Exact classification of “basic Energy” from the chosen API fields.
- Hard 60-card cap vs soft warning.
