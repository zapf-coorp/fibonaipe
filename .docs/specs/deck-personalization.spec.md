# Spec: deck-personalization

## 1. Overview

Favorite flag and numeric rating on decks so users can highlight and evaluate their builds.

## 2. User Stories

- As a user, I favorite decks I care about.
- As a user, I rate a deck to remember how I feel about it.
- As a user, favorites and ratings show on the deck list.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-DP-1 | Toggle deck favorite on/off from deck list or deck view (≤ 2 clicks). |
| FR-DP-2 | Set deck rating on a 1–5 integer scale; support clearing to “unrated”. |
| FR-DP-3 | Persist favorite and rating with the deck entity (db-setup). |
| FR-DP-4 | Deck list displays favorite indicator and rating. |
| FR-DP-5 | Favorited decks appear in the favorites area (card-favorites). |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-DP-1 | Controls accessible (named buttons/stars) with pt-BR labels. |
| NF-DP-2 | Rating changes are local and immediate. |

## 5. Acceptance Criteria

1. Favorite on → indicator visible; reload preserves state.
2. Favorite off → removed from favorites section.
3. Set rating 4 → list shows 4; clear rating → shows unrated.
4. Duplicate deck does not share favorite/rating identity (new deck starts unfavorited/unrated unless product decides to copy — default: do not copy favorite/rating).

## 6. Open Questions

- Half-star ratings — out of scope for v1 (integers only).
- Whether duplicate copies rating — default no.
