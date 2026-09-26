# Spec: responsive-layout

## 1. Overview

Responsive shell and visual identity for MyPokeCards: card-forward layouts on desktop, tablet, and mobile; distinctive modern TCG-inspired look; minimal navigation friction.

## 2. User Stories

- As a mobile user, I search and build decks without cramped menus or extra steps.
- As a desktop user, I see cards large and can keep deck context visible while browsing.
- As a user, the app feels like a crafted card-game product, not a generic template.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-RL-1 | Primary navigation covers: Buscar, Decks, Coleção, Favoritos (labels pt-BR); theme toggle accessible. |
| FR-RL-2 | Breakpoints: usable at ≈360 px, ≈768 px, ≥1280 px. |
| FR-RL-3 | Card images dominate browse/build surfaces; avoid unnecessary multi-step wizards. |
| FR-RL-4 | Desktop may use split/sticky deck tray; mobile uses sheet/bottom bar or dedicated deck tab without hiding add actions. |
| FR-RL-5 | Visual identity: custom color tokens, expressive typography, subtle motion (e.g. theme transition, card hover/press) — at least 2–3 intentional motions. |
| FR-RL-6 | Do not rely on generic purple-on-white AI landing aesthetics; define a coherent TCG-inspired direction. |
| FR-RL-7 | Touch targets for primary actions ≥ 44 px where feasible. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-RL-1 | No critical horizontal overflow on mobile for core flows. |
| NF-RL-2 | Prefer CSS tokens for themeable identity (works with theme-provider). |
| NF-RL-3 | Performance: avoid heavy decorative animations that block interaction. |

## 5. Acceptance Criteria

1. Core flows (search → detail → add to deck; collection missing; favorites; theme) work on mobile and desktop widths.
2. Brand/product name is clearly present in the primary chrome/hero of the app shell.
3. Light and dark themes both preserve identity and readability.
4. Navigation reaches all major areas in one tap from the shell.

## 6. Open Questions

- Exact motion library vs CSS-only — Technology Architect.
- Bottom nav vs sidebar collapse pattern on tablet.
