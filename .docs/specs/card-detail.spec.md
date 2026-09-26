# Spec: card-detail

## 1. Overview

Detailed view of a single card: large image, localized metadata, and quick actions to add to deck, adjust collection owned count, and favorite the card.

## 2. User Stories

- As a user, I open a card and see its image and key attributes clearly.
- As a user, I add the card to my active/selected deck in one or two taps.
- As a user, I set how many copies I own without leaving the detail view.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CD-1 | Show primary card image at large size; support fallback if image fails to load. |
| FR-CD-2 | Show display name (pt-BR when available), types, rarity, set, cost/energy, and rules/ability text when provided by api-client. |
| FR-CD-3 | Action: add to selected deck (≤ 2 clicks/taps total path from this view). |
| FR-CD-4 | Action: increment/decrement owned copies (collection-manager). |
| FR-CD-5 | Action: toggle card favorite (card-favorites). |
| FR-CD-6 | Back/close returns to previous browse context without losing search query when feasible. |
| FR-CD-7 | All labels and errors in pt-BR. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-CD-1 | Detail usable on narrow mobile viewports (scrollable content, sticky primary actions if needed). |
| NF-CD-2 | Loading and error states for detail fetch. |
| NF-CD-3 | Do not overlay floating promotional badges on the card art. |

## 5. Acceptance Criteria

1. Opening a card from search shows image + metadata.
2. Add-to-deck from detail updates the selected deck and is achievable in ≤ 2 taps after deck is selected.
3. Changing owned count reflects in collection-manager / missing cards.
4. Favorite toggle updates favorites area.
5. Failed image load shows a non-breaking placeholder.

## 6. Open Questions

- Modal vs dedicated route for detail.
- Show multiple printings of the “same” Pokémon as related cards.
