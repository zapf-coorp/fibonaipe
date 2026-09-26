# Spec: data-portability

## 1. Overview

Import and export decks in human-readable JSON and PTCGO-style plain text so users can back up, share, and migrate lists without a backend.

## 2. User Stories

- As a user, I export my deck to JSON or text and save/share it.
- As a user, I paste or upload an exported deck and get an editable local deck.
- As a user, bad import data does not damage existing decks.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-IO-1 | Export selected deck to JSON including name and list of card identifiers + quantities (and optional display names). |
| FR-IO-2 | Export selected deck to PTCGO-style text (sections such as Pokémon / Trainer / Energy with `Qty Name` lines — adapt to available card supertypes). |
| FR-IO-3 | Import from JSON creating a new deck (or explicitly replacing only when user confirms). |
| FR-IO-4 | Import from PTCGO-style text; resolve lines to card ids via api-client search/lookup best effort. |
| FR-IO-5 | On unresolved names, report which lines failed; do not silently invent cards. |
| FR-IO-6 | Invalid files/text fail with pt-BR error; existing store unchanged. |
| FR-IO-7 | Round-trip: export JSON → import JSON yields equivalent composition. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-IO-1 | Export output is plain text / JSON readable in a text editor. |
| NF-IO-2 | Import of a 60-card list completes with clear progress/error summary. |
| NF-IO-3 | Document formats in `.docs/` (field list and PTCGO example). |

## 5. Acceptance Criteria

1. Export JSON downloads or copies text containing all card quantities.
2. Export PTCGO-style is readable and lists quantities.
3. Import valid JSON creates a deck matching composition.
4. Import with one bad line reports the failure; user can cancel or import partial only if explicitly chosen (default: fail whole import if resolution is required — document decision).
5. Malformed JSON does not delete existing decks.

## 6. Open Questions

- Strict fail-all vs partial import for unresolved PTCGO lines.
- Include set codes/collector numbers in export for disambiguation.
