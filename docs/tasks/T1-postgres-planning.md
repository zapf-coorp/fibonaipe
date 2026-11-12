# T1 — Explicit `planning` in `Persistence` & Postgres Fix

**Status:** DONE (Already implemented and verified)

## What Was Done

1. **`packages/application/src/ports/persistence.port.ts` & `packages/application/src/index.ts`**:
   - Added explicit interfaces `PersistedParticipantSnapshot`, `PersistedItemSnapshot`, `PersistedRoundSnapshot`, `PersistedVoteSnapshot`, and `PersistedRoomPlanning`.
   - Added `readonly planning?: PersistedRoomPlanning;` to `PersistedRoomRecord`.
2. **`packages/application/src/use-cases/room-session.ts`**:
   - Removed duplicate private `Stored*` interfaces and unsafe type casts; `planningOf` and `toPersisted` now use `PersistedRoomPlanning` directly.
3. **`packages/adapter-persistence-postgres/migrations/007_room_planning_json.sql`**:
   - Created migration adding `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS planning_json jsonb;`.
4. **`packages/adapter-persistence-postgres/src/postgres-persistence.ts`**:
   - Updated `findRoom`, `findRoomByCode`, `saveRoom`, and `mapRoom` to persist and rehydrate `planning_json` (including ISO `Date` revival via `reviveIsoDates`).
5. **`packages/adapter-persistence-sqlite/src/sqlite-persistence.ts`**:
   - Updated `planningJson` and `planningOf` to use `room.planning` directly without type casts.
6. **`packages/testing/src/contracts/persistence.contract.ts`**:
   - Added contract test `"round-trips room.planning snapshot with nested Dates by id and code"`.
