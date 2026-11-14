# T7 — Clean Code Modularization for Human & Small-LLM Readability

**Status:** DONE  
**Depends on:** T6  
**Max files per sub-step:** 4

## Goal

Split the 4 largest monolithic files in the repository into small, single-responsibility modules (~100–250 lines each) with clear semantic names. **Zero behavior changes**: all existing public exports and tests must continue to work without modification.

Execute the 4 sub-steps below one by one, running `npm run typecheck && npx vitest run` after each sub-step.

---

## Sub-step T7.1 — Split `apps/web/src/server/routes/auth-teams.ts` (~460 lines)

Create focused route modules in `apps/web/src/server/routes/`:
1. `http-helpers.ts`: shared helpers (`sessionUser`, `superAdminEmails`, `notFound`, `fail`, `okJson`, `jsonWithSession`, `parseBody`, `clientIp`).
2. `auth-routes.ts`: `/api/auth/magic-link`, `/api/auth/google`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/callback`, `/api/admin/users`.
3. `team-routes.ts`: `/api/teams*`, `/api/invites/accept`, `/api/teams/:id/members*`, `/api/teams/:id/invites`, `/api/teams/:id/tasks*`, `/api/teams/:id/history`, `/api/teams/:id/indicators`, `/api/teams/:id/holidays*`.
4. `sprint-routes.ts`: `/api/teams/:id/sprints*`, `/api/teams/:id/forecast*`.
5. Keep `registerAuthTeamRoutes(app, container)` in `auth-teams.ts` as a thin 20-line facade that calls `registerAuthRoutes`, `registerTeamRoutes`, and `registerSprintRoutes`.

---

## Sub-step T7.2 — Split `packages/application/src/use-cases/room-session.ts` (~630 lines)

Extract pure serialization and event-mapping helpers into sibling modules inside `packages/application/src/use-cases/`:
1. `room-hydration.ts`: `LoadedRoom`, `hydrate`, `toPersisted`, `itemPropsOf`, `freshItem`.
2. `room-events.ts`: `mapPlanning`, `participantJoined`, `participantUpdated`, `hostTransferred`, `settingsUpdated`.
3. Keep `room-session.ts` focused on transaction orchestration, rate-limiting, idempotency (`beginOp`, `finishOp`), and authorization (`authorize`), and re-export the symbols from `room-hydration.ts` and `room-events.ts` so all existing use-case imports keep working unchanged.

---

## Sub-step T7.3 — Split `packages/adapter-persistence-sqlite/src/sqlite-persistence.ts` (~1000 lines)

Extract schema and row mappers inside `packages/adapter-persistence-sqlite/src/`:
1. `sqlite-schema.ts`: `SCHEMA` constant, `prepare(db)`, `Statements` interface, and `ensure*Column` / `ensure*Schema` migration helpers.
2. `sqlite-mappers.ts`: pure row-to-record and record-to-row functions (`roomFromRow`, `historyFromRow`, `auditFromRow`, `teamFromRow`, `membershipFromRow`, `inviteFromRow`, `sprintFromRow`, `userFromRow`, `reviveDates`, `cloneData`).
3. Keep `SqlitePersistenceStore` and `createSqlitePersistence` in `sqlite-persistence.ts`.

---

## Sub-step T7.4 — Split `packages/adapter-persistence-postgres/src/postgres-persistence.ts` (~760 lines)

Extract row types and mapping functions inside `packages/adapter-persistence-postgres/src/`:
1. `postgres-mappers.ts`: `RoomRow`, `ItemRow`, `HistoryRow`, `MembershipRow`, `InviteRow`, `UserRow`, `mapRoom`, `mapHistory`, `mapSprint`, `mapMembership`, `mapInvite`, `mapUser`, `historyDetail`, `reviveIsoDates`, `asDate`, `asNumber`.
2. Keep pool management, migration runner (`applyPostgresMigrations`), transaction locking (`runTransaction`), and repository methods in `postgres-persistence.ts`.

## Verification

Run:
```sh
npm run lint
npm run typecheck
npm run check:boundaries
npx vitest run
```
