# Spec: deck-core

## 1. Overview

Lifecycle management for decks: create, name, list, rename, duplicate, and delete. Composition editing is owned by deck-builder; favorite/rating by deck-personalization.

## 2. User Stories

- As a user, I create a named deck and see it in my deck list.
- As a user, I duplicate a deck to experiment without losing the original.
- As a user, I delete a deck only after confirming.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-DK-1 | Create deck with required non-empty name (trim whitespace). |
| FR-DK-2 | List decks with name, card count, favorite indicator, and rating summary. |
| FR-DK-3 | Rename an existing deck. |
| FR-DK-4 | Duplicate a deck (new id, copy of cards/quantities; name derived e.g. “Cópia de …” or user-editable). |
| FR-DK-5 | Delete deck with explicit confirmation; irreversible in v1. |
| FR-DK-6 | Select an active/working deck used by deck-builder and missing-card views. |
| FR-DK-7 | Persist all deck entities via db-setup. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-DK-1 | Deck list remains usable with dozens of decks (simple virtualization optional). |
| NF-DK-2 | Duplicate completes as a local operation without API calls. |
| NF-DK-3 | UI copy in pt-BR. |

## 5. Acceptance Criteria

1. Create → appears in list after reload.
2. Rename updates list and detail header.
3. Duplicate yields a second deck with identical card quantities and a distinct id.
4. Delete without confirmation does nothing; confirm removes deck and its personalization fields.
5. Selecting a deck makes it the target for subsequent add-card actions.

## 6. Open Questions

- Enforce 60-card deck size — advisory vs hard block (see requirements Open Questions).
- Sort order of deck list (updatedAt, name, favorites first).
