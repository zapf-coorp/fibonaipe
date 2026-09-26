# Spec: api-client

## 1. Overview

Client module that fetches Pokémon TCG card metadata and images from a free public API, with pt-BR display support and documented fallback when locale coverage is incomplete. All API choice and endpoint details must be recorded under `.docs/`.

## 2. User Stories

- As a user, I see card names in Portuguese (pt-BR) whenever reasonably available.
- As a user, search still works if pt-BR data is incomplete (fallback to available locale + cache).
- As a developer, I can read which API and rate-limit strategy the app uses in `.docs/`.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-API-1 | Prefer a free Pokémon TCG data API (Pokémon TCG API, tcgpocket, or equivalent free source with locale when possible). |
| FR-API-2 | Expose search by text query returning card list items suitable for a visual grid (id, display name, image URL, type/rarity/set summary). |
| FR-API-3 | Expose fetch-by-id (or equivalent) for full card detail fields needed by card-detail and deck stats. |
| FR-API-4 | Resolve display name in pt-BR when API provides locale; otherwise apply fallback (cached map and/or base locale) without failing the request. |
| FR-API-5 | Cache recent search/detail responses in memory and/or local persistence to reduce duplicate calls. |
| FR-API-6 | Surface typed error states for network failure, rate limit, and empty results. |
| FR-API-7 | Document chosen API, auth/key needs (if any), rate limits, image attribution, and pt-BR strategy in `.docs/` (e.g. technologies or dedicated API note). |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-API-1 | Respect provider rate limits; backoff or queue when limited. |
| NF-API-2 | Debounce is owned by UI (card-search); client should be idempotent and safe under rapid calls. |
| NF-API-3 | Do not require a paid API key for core v1 functionality. |

## 5. Acceptance Criteria

1. Searching a known card name returns at least one result with image URL and id.
2. Detail fetch for a valid id returns fields needed for display and stats (types, rarity, cost/energy when available).
3. When pt-BR is missing for a card, UI still shows a usable name (fallback) and does not crash.
4. Network failure returns a controllable error; app remains usable for local decks/collection.
5. `.docs/` contains the API decision record.

## 6. Open Questions

- Final primary API and whether a secondary fallback API is needed.
- Depth of pt-BR coverage (names only vs full rules text).
