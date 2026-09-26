# Spec: theme-provider

## 1. Overview

Application-wide light and dark themes with persistent user preference and CSS tokens aligned to the MyPokeCards visual identity.

## 2. User Stories

- As a user, I can switch between light and dark theme in one click/tap.
- As a user, my theme choice remains after reload.
- As a user, cards and chrome remain readable in both themes.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-TH-1 | Provide a global theme toggle control visible from primary chrome (header or equivalent). |
| FR-TH-2 | Themes: `light` and `dark` covering backgrounds, text, borders, and accent tokens. |
| FR-TH-3 | Persist preference via db-setup storage. |
| FR-TH-4 | On first visit, choose a sensible default (system preference or light — document choice). |
| FR-TH-5 | Theme changes apply immediately without full page reload. |

## 4. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-TH-1 | Contrast remains readable for body text and controls in both themes (WCAG AA target for text). |
| NF-TH-2 | No flash of wrong theme on load when preference is already stored (minimize FOUC). |
| NF-TH-3 | Tokens support the distinctive card-game identity (not a generic default purple kit). |

## 5. Acceptance Criteria

1. Toggle switches light ↔ dark and updates surfaces immediately.
2. Reload preserves the last selected theme.
3. Icon-only toggle has an accessible name in pt-BR.
4. Card images remain the visual focus; theme does not obscure primary content.

## 6. Open Questions

- Follow `prefers-color-scheme` on first visit — yes/no.
