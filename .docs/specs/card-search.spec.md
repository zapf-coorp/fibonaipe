# Spec: card-search

## 1. Overview

Search and browse Pokémon TCG cards via the api-client, presenting results as a responsive, card-image-first grid with pt-BR UI copy and low-friction actions toward deck and collection features.

## 2. User Stories

- As a user, I type a name and see matching cards with images.
- As a user, I clear the query and return to a default/empty or featured state without errors.
- As a user, I can open card detail or add to deck from a result with minimal clicks.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CS-1 | Text search field with pt-BR placeholder/label (e.g. “Buscar cartas…”). |
| FR-CS-2 | Debounce input ≤ 300 ms before calling api-client search. |
| FR-CS-3 | Display results in a responsive image grid (desktop multi-column → tablet → mobile). |
| FR-CS-4 | Each result shows at least image and display name (pt-BR when available). |
| FR-CS-5 | Show empty state when query has no matches; show error state on API failure. |
| FR-CS-6 | Selecting a result opens card-detail (or equivalent detail surface). |
| FR-CS-7 | From a result, user can start add-to-deck within ≤ 2 clicks/taps (with deck context). |
| FR-CS-8 | Optional filters (type/set) may be added if API supports them without cluttering the primary search. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-CS-1 | Keyboard-focusable search input with accessible name. |
| NF-CS-2 | Avoid blocking the whole app shell while searching; show loading indicator on results area. |
| NF-CS-3 | Card images are the dominant visual; avoid heavy card chrome/boxes that hide artwork. |

## 5. Acceptance Criteria

1. Query for a well-known Pokémon name yields visible image results.
2. Debounced behavior does not fire a request on every keystroke.
3. Empty query handling is defined and does not spam the API.
4. “Nenhum resultado” (or equivalent) appears only when a non-empty query returns zero hits.
5. Works at mobile and desktop widths without horizontal overflow of the grid.

## 6. Open Questions

- Infinite scroll vs pagination for large result sets.
- Default landing content when search is empty (recent, popular, or blank).
