# T9 — Documentation Sync & Full Verification Gate

**Status:** TODO  
**Depends on:** T1 through T8  
**Max files to touch:** 5 (`docs/prd/roadmap.md`, `docs/specs/architecture.md`, `docs/specs/integrations-and-auth.md`, `docs/specs/operations.md`, `docs/tasks/README.md`)

## Goal

Update the project documentation to reflect the completed production architecture, auth adapter, local disk persistence, and modularized files, then run the full `npm run verify` gate and update the knowledge graph.

## Step-by-Step Instructions

1. **`docs/tasks/README.md`**: Mark T1 through T9 as `DONE`.
2. **`docs/prd/roadmap.md`**: Update the R2 status table to reflect that `@fibonaipe/adapter-auth-supabase`, `/login`, `ClaimRoom`, and `LinkGuestToAccount` routes are shipped.
3. **`docs/specs/architecture.md`**: List `@fibonaipe/adapter-auth-supabase` in the Packages table and note the modular split of `routes/*`, `room-hydration.ts`, and `*-mappers.ts`.
4. **`docs/specs/integrations-and-auth.md`**: Document how `AUTH_DRIVER=supabase` (production) and `AUTH_DRIVER=dev-fake` (local dev simulator) operate behind `AuthProvider`.
5. **`docs/specs/operations.md`**: Document `PERSISTENCE_DRIVER=sqlite` (`data/local.sqlite` in dev) vs `PERSISTENCE_DRIVER=postgres` (production) and how to run `npm run build && npm start`.

## Final Verification Gate

Run from repository root:
```sh
npm run verify
graphify update .
```
Every check in `npm run verify` (lint, typecheck, boundaries, i18n, licenses, unit/contract/property tests, build, bundle budget, and E2E/axe) must pass.
