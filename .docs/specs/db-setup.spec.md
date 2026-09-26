# Spec: db-setup

## 1. Overview

Local browser persistence for decks, collection ownership, favorites, ratings, theme preference, and optional pt-BR name cache. No backend. Data must survive refresh and be readable by feature modules.

## 2. User Stories

- As a user, my decks and collection remain after I close and reopen the app.
- As a user, my theme and favorites survive page reload.
- As a user, clearing browser site data may erase my data (accepted for v1).

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-DB-1 | Persist decks (id, name, cards with quantities, favorite flag, rating, timestamps). |
| FR-DB-2 | Persist collection map: card id → owned copy count (≥ 0). |
| FR-DB-3 | Persist favorited card ids and deck favorite/rating fields. |
| FR-DB-4 | Persist theme preference (`light` \| `dark`). |
| FR-DB-5 | Optionally persist pt-BR display-name cache keyed by card id. |
| FR-DB-6 | Load all required stores on app start before showing stale empty UI as “final”. |
| FR-DB-7 | Mutations shall be atomic per entity (a failed write must not partially corrupt unrelated entities). |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-DB-1 | Use browser local storage suitable for structured data (IndexedDB and/or localStorage — Technology Architect decides). |
| NF-DB-2 | Local read/write for typical deck sizes (≤ ~100 unique cards) completes within 100 ms on mid-range hardware. |
| NF-DB-3 | Storage keys/schema versioning strategy must allow future migrations without silent data loss. |

## 5. Acceptance Criteria

1. Create a deck, reload the page → deck still present with same cards.
2. Change owned count, reload → count preserved.
3. Toggle theme, reload → theme preserved.
4. Favorite a card and a deck, reload → both still favorited.
5. Documented schema version exists; empty first-run initializes cleanly.

## 6. Open Questions

- IndexedDB vs localStorage vs hybrid — deferred to Technology Architect.
- Soft-delete / undo for deck deletion — out of scope unless product later requires it.
