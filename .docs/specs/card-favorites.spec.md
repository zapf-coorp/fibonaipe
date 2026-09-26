# Spec: card-favorites

## 1. Overview

Dedicated favorites area for favorited cards and favorited decks, enabling quick return to preferred content.

## 2. User Stories

- As a user, I favorite cards from search or detail and find them later in one place.
- As a user, I see my favorite decks alongside favorite cards.
- As a user, I unfavorite from the favorites area or original surfaces.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CF-1 | Toggle favorite on a card from detail (and optionally search result). |
| FR-CF-2 | Persist favorited card ids via db-setup. |
| FR-CF-3 | Favorites area lists favorited cards (image + name) and favorited decks. |
| FR-CF-4 | Empty favorites state with pt-BR guidance. |
| FR-CF-5 | Navigating a favorite card opens card-detail; favorite deck opens deck view. |
| FR-CF-6 | Unfavorite removes item from the list immediately. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-CF-1 | Favorites area is reachable from primary navigation without deep nesting. |
| NF-CF-2 | Card-forward visuals consistent with search grid. |
| NF-CF-3 | UI copy in pt-BR. |

## 5. Acceptance Criteria

1. Favorite a card → appears under Favoritos → Cartas (or unified list section).
2. Favorite a deck → appears under Favoritos → Decks.
3. Unfavorite from either location syncs state everywhere.
4. Reload preserves favorites.

## 6. Open Questions

- Single scrollable list vs tabs for cards vs decks (see requirements).
