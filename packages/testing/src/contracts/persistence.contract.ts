import { describe, expect, it } from "vitest";
import {
  ClientOpId,
  HistoryEntryId,
  ItemId,
  ParticipantId,
  RoomCode,
  RoomId,
  RoundId,
  TeamId,
  createAppError,
  ok,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import type { AggregatedHistoryRecord, PersistedRoomRecord, Persistence } from "@fibonaipe/application";

type VoteLeakKey = "vote" | "votes" | "shortComment" | "card" | "cards" | "comment";

type HistoryHidesIndividualVotes = Extract<keyof AggregatedHistoryRecord, VoteLeakKey> extends never
  ? true
  : never;

const historyHidesIndividualVotes: HistoryHidesIndividualVotes = true;

export function describePersistenceContract(name: string, factory: () => Persistence): void {
  describe(name, () => {
    it("round-trips a room by id and code and keeps the caller's object unshared", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-crud"));
      const code = must(RoomCode.create("23456789"));
      const item = must(ItemId.create("item-crud"));
      const draftItems = [{ id: item, title: "one" }];
      const room = roomRecord({
        id,
        code,
        name: "Crud",
        version: 3,
        items: draftItems,
      });

      await saveUnlocked(persistence, room);
      const expected = structuredClone(room);
      draftItems[0] = { id: item, title: "mutated-by-caller" };

      const byId = await readRoom(persistence, id);
      const byCode = await readByCode(persistence, code);
      expect(byId).toEqual(expected);
      expect(byCode).toEqual(expected);
      expect(byId?.items[0]?.title).toBe("one");

      const missingId = must(RoomId.create("room-missing"));
      const missingCode = must(RoomCode.create("ZZZZZZZZ"));
      expect(await readRoom(persistence, missingId)).toBeNull();
      expect(await readByCode(persistence, missingCode)).toBeNull();
    });

    it("preserves the inserted version and then increments a locked save by exactly 1", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-version"));
      const inserted = roomRecord({
        id,
        code: must(RoomCode.create("2345678A")),
        version: 4,
        name: "Inserted",
      });
      await saveUnlocked(persistence, inserted);
      expect((await readRoom(persistence, id))?.version).toBe(4);

      const activity = new Date("2026-10-26T15:04:05.000Z");
      const bumped = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errNotFound();
        await repos.rooms.save({
          ...current,
          version: 999,
          name: "Bumped",
          lastActivityAt: activity,
        });
        return ok(current.version);
      });
      expect(bumped).toEqual(ok(4));

      const stored = await readRoom(persistence, id);
      expect(stored?.version).toBe(5);
      expect(stored?.name).toBe("Bumped");
      expect(stored?.lastActivityAt.toISOString()).toBe(activity.toISOString());
    });

    it("serializes 100 concurrent transactions on one lockRoomId from version 1 to 101", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-1"));
      await saveUnlocked(
        persistence,
        roomRecord({
          id,
          code: must(RoomCode.create("2345678B")),
          version: 1,
          status: "open",
          items: [],
        }),
      );

      const itemIds = Array.from({ length: 100 }, (_, index) => must(ItemId.create(`item-${index}`)));
      const pending = Array.from({ length: 100 }, (_, index) =>
        persistence.transaction({ lockRoomId: id, isolation: "serializable" }, async (repos) => {
          const current = await repos.rooms.findById(id);
          if (!current) return errNotFound();
          const itemId = itemIds[index];
          if (!itemId) return errNotFound();
          await repos.rooms.save({
            ...current,
            items: [...current.items, { id: itemId, title: String(index) }],
          });
          return ok(current.version);
        }),
      );

      const results = await Promise.all(pending);
      const seen = results.map((result) => {
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.error.messageKey);
        return result.value;
      });
      expect([...seen].sort((left, right) => left - right)).toEqual(
        Array.from({ length: 100 }, (_, index) => index + 1),
      );

      const finalRoom = await readRoom(persistence, id);
      expect(finalRoom?.version).toBe(101);
      expect(finalRoom?.items.map((item) => item.title)).toEqual(
        Array.from({ length: 100 }, (_, index) => String(index)),
      );
    });

    it("lets a different room commit while another room lock is held", async () => {
      const persistence = factory();
      const roomA = must(RoomId.create("room-a"));
      const roomB = must(RoomId.create("room-b"));
      await saveUnlocked(persistence, roomRecord({ id: roomA, code: must(RoomCode.create("2345678C")), name: "A" }));
      await saveUnlocked(persistence, roomRecord({ id: roomB, code: must(RoomCode.create("2345678D")), name: "B" }));

      const gate = deferred<void>();
      let enteredA = false;
      let finishedA = false;
      const txA = persistence.transaction({ lockRoomId: roomA }, async (repos) => {
        enteredA = true;
        await gate.promise;
        const current = await repos.rooms.findById(roomA);
        if (!current) return errNotFound();
        await repos.rooms.save({ ...current, name: "A2" });
        finishedA = true;
        return ok(current.version);
      });
      await waitUntil(() => enteredA);

      const txB = await persistence.transaction({ lockRoomId: roomB }, async (repos) => {
        const current = await repos.rooms.findById(roomB);
        if (!current) return errNotFound();
        await repos.rooms.save({ ...current, name: "B2" });
        return ok(current.version);
      });

      expect(finishedA).toBe(false);
      expect(txB).toEqual(ok(1));
      expect((await readRoom(persistence, roomB))?.version).toBe(2);
      expect((await readRoom(persistence, roomB))?.name).toBe("B2");
      expect((await readRoom(persistence, roomA))?.version).toBe(1);

      gate.resolve();
      expect(await txA).toEqual(ok(1));
      expect((await readRoom(persistence, roomA))?.version).toBe(2);
      expect((await readRoom(persistence, roomA))?.name).toBe("A2");
    });

    it("rolls back room version, items, history, and clientOpId when work returns err", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-rollback-err"));
      const actorId = must(ParticipantId.create("participant-err"));
      const clientOpId = must(ClientOpId.create("op-99"));
      const historyId = must(HistoryEntryId.create("hist-err"));
      const itemOne = must(ItemId.create("item-err-1"));
      const itemTwo = must(ItemId.create("item-err-2"));
      const seeded = roomRecord({
        id,
        code: must(RoomCode.create("2345678E")),
        version: 5,
        items: [
          { id: itemOne, title: "one" },
          { id: itemTwo, title: "two" },
        ],
      });
      await saveUnlocked(persistence, seeded);
      const expected = structuredClone(seeded);

      const result = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errNotFound();
        await repos.rooms.save({
          ...current,
          version: 50,
          items: [...current.items, { id: must(ItemId.create("item-err-3")), title: "three" }],
        });
        await repos.idempotency.record(actorId, clientOpId, new Date("2026-10-26T12:00:00.000Z"));
        await repos.history.appendAggregated(
          historyRecord({ id: historyId, roomId: id, itemId: itemOne, roundId: must(RoundId.create("round-err")) }),
        );
        return errResult("ROUND_NOT_VOTING");
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected rollback");
      expect(result.error.code).toBe("ROUND_NOT_VOTING");
      expect(result.error.messageKey).toBe("errors.ROUND_NOT_VOTING");
      expect(result.error.params).toBeUndefined();
      expect(await readRoom(persistence, id)).toEqual(expected);
      expect(await hasProcessed(persistence, actorId, clientOpId)).toBe(false);
      expect(await readHistory(persistence, historyId)).toBeNull();

      const followed = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errNotFound();
        return ok(current.version);
      });
      expect(followed).toEqual(ok(5));
    });

    it("rolls back and releases the room lock when work throws", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-rollback-throw"));
      const actorId = must(ParticipantId.create("participant-throw"));
      const clientOpId = must(ClientOpId.create("op-100"));
      const seeded = roomRecord({
        id,
        code: must(RoomCode.create("2345678F")),
        version: 5,
        name: "Stable",
        items: [
          { id: must(ItemId.create("item-throw-1")), title: "one" },
          { id: must(ItemId.create("item-throw-2")), title: "two" },
        ],
      });
      await saveUnlocked(persistence, seeded);
      const expected = structuredClone(seeded);

      const failed = persistence.transaction({ lockRoomId: id }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errNotFound();
        const first = current.items[0];
        if (!first) return errNotFound();
        Object.assign(first, { title: "changed" });
        await repos.rooms.save({ ...current, name: "Dirty", version: 9 });
        await repos.idempotency.record(actorId, clientOpId, new Date("2026-10-26T12:00:00.000Z"));
        throw new Error("defect");
      });
      await expect(failed).rejects.toThrow("defect");

      expect(await readRoom(persistence, id)).toEqual(expected);
      expect(await hasProcessed(persistence, actorId, clientOpId)).toBe(false);

      const followed = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errNotFound();
        await repos.rooms.save({ ...current, name: "After defect" });
        return ok(current.version);
      });
      expect(followed).toEqual(ok(5));
      const stored = await readRoom(persistence, id);
      expect(stored?.version).toBe(6);
      expect(stored?.name).toBe("After defect");
    });

    it("records a clientOpId once per actor and does not treat another actor as processed", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-idem"));
      const actorId = must(ParticipantId.create("participant-1"));
      const otherActor = must(ParticipantId.create("participant-2"));
      const clientOpId = must(ClientOpId.create("op-cast-1"));
      const otherOp = must(ClientOpId.create("op-cast-2"));
      const now = new Date("2026-10-26T12:00:00.000Z");
      await saveUnlocked(persistence, roomRecord({ id, code: must(RoomCode.create("2345678G")), version: 2 }));

      expect(await hasProcessed(persistence, actorId, clientOpId)).toBe(false);
      const first = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        await repos.idempotency.record(actorId, clientOpId, now);
        return ok(true);
      });
      expect(first).toEqual(ok(true));
      expect(await readRoom(persistence, id)).toMatchObject({ version: 2 });
      expect(await hasProcessed(persistence, actorId, clientOpId)).toBe(true);
      expect(await hasProcessed(persistence, actorId, otherOp)).toBe(false);
      expect(await hasProcessed(persistence, otherActor, clientOpId)).toBe(false);

      const repeat = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        const processed = await repos.idempotency.hasProcessed(actorId, clientOpId, now);
        if (processed) return ok("duplicate");
        await repos.idempotency.record(actorId, clientOpId, now);
        return ok("recorded");
      });
      expect(repeat).toEqual(ok("duplicate"));
      expect((await readRoom(persistence, id))?.version).toBe(2);
    });

    it("discards unsaved edits made on the transactional working copy", async () => {
      const persistence = factory();
      const id = must(RoomId.create("room-working-copy"));
      const seeded = roomRecord({
        id,
        code: must(RoomCode.create("2345678H")),
        version: 2,
        name: "Original",
      });
      await saveUnlocked(persistence, seeded);
      const expected = structuredClone(seeded);

      const result = await persistence.transaction({ lockRoomId: id }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errNotFound();
        Object.assign(current, { name: "Dirty", version: 99 });
        return ok(true);
      });
      expect(result).toEqual(ok(true));
      expect(await readRoom(persistence, id)).toEqual(expected);
    });

    it("purges expired guest rooms and keeps active guest rooms and team rooms", async () => {
      const persistence = factory();
      const before = new Date("2026-10-26T13:00:00.000Z");
      const expired = roomRecord({
        id: must(RoomId.create("guest-expired")),
        code: must(RoomCode.create("2345678J")),
        kind: "guest",
        expiresAt: new Date("2026-10-26T12:00:00.000Z"),
      });
      const exact = roomRecord({
        id: must(RoomId.create("guest-exact")),
        code: must(RoomCode.create("2345678K")),
        kind: "guest",
        expiresAt: new Date(before.getTime()),
      });
      const active = roomRecord({
        id: must(RoomId.create("guest-active")),
        code: must(RoomCode.create("2345678M")),
        kind: "guest",
        expiresAt: new Date(before.getTime() + 1),
      });
      const openGuest = roomRecord({
        id: must(RoomId.create("guest-open")),
        code: must(RoomCode.create("2345678N")),
        kind: "guest",
        expiresAt: null,
      });
      const teamOld = roomRecord({
        id: must(RoomId.create("team-old")),
        code: must(RoomCode.create("2345678P")),
        kind: "team",
        teamId: must(TeamId.create("team-1")),
        expiresAt: new Date("2026-10-25T13:00:00.000Z"),
      });
      const teamOpen = roomRecord({
        id: must(RoomId.create("team-open")),
        code: must(RoomCode.create("2345678Q")),
        kind: "team",
        teamId: must(TeamId.create("team-2")),
        expiresAt: null,
      });

      for (const room of [expired, exact, active, openGuest, teamOld, teamOpen]) {
        await saveUnlocked(persistence, room);
      }

      const purged = await persistence.transaction({}, async (repos) => {
        await repos.rooms.deleteExpiredAnonymous(before);
        return ok(true);
      });
      expect(purged).toEqual(ok(true));

      expect(await readRoom(persistence, expired.id)).toBeNull();
      expect(await readByCode(persistence, expired.code)).toBeNull();
      expect(await readRoom(persistence, exact.id)).toBeNull();
      expect(await readRoom(persistence, active.id)).toEqual(active);
      expect(await readRoom(persistence, openGuest.id)).toEqual(openGuest);
      expect(await readRoom(persistence, teamOld.id)).toEqual(teamOld);
      expect(await readRoom(persistence, teamOpen.id)).toEqual(teamOpen);
    });

    it("round-trips aggregated history and rejects individual vote fields on the record type", async () => {
      expect(historyHidesIndividualVotes).toBe(true);
      const persistence = factory();
      const roomId = must(RoomId.create("room-history"));
      const entry = historyRecord({
        id: must(HistoryEntryId.create("hist-1")),
        roomId,
        itemId: must(ItemId.create("item-hist")),
        roundId: must(RoundId.create("round-hist")),
      });
      const other = historyRecord({
        id: must(HistoryEntryId.create("hist-2")),
        roomId,
        itemId: must(ItemId.create("item-hist-2")),
        roundId: must(RoundId.create("round-hist-2")),
        stats: { voteCount: 1, consensus: false },
      });
      const foreign = historyRecord({
        id: must(HistoryEntryId.create("hist-foreign")),
        roomId: must(RoomId.create("room-other")),
        itemId: must(ItemId.create("item-foreign")),
        roundId: must(RoundId.create("round-foreign")),
      });

      const written = await persistence.transaction({}, async (repos) => {
        await repos.history.appendAggregated(entry);
        await repos.history.appendAggregated(other);
        await repos.history.appendAggregated(foreign);
        return ok(true);
      });
      expect(written).toEqual(ok(true));
      expect(await readHistory(persistence, entry.id)).toEqual(entry);
      expect(await readHistory(persistence, must(HistoryEntryId.create("hist-missing")))).toBeNull();

      const listed = await persistence.transaction({}, async (repos) => ok(await repos.history.query({ roomId })));
      expect(listed.ok).toBe(true);
      if (!listed.ok) throw new Error(listed.error.messageKey);
      expect([...listed.value].map((row) => row.id).sort()).toEqual([entry.id, other.id].sort());
    });

    it("answers ping with ok", async () => {
      const persistence = factory();
      expect(await persistence.ping()).toEqual(ok({ ok: true }));
    });
  });
}

function roomRecord(overrides: Partial<PersistedRoomRecord> & Pick<PersistedRoomRecord, "id" | "code">): PersistedRoomRecord {
  const record = {
    name: "Room",
    kind: "guest" as const,
    teamId: null,
    status: "open" as const,
    version: 1,
    items: [],
    expiresAt: null,
    lastActivityAt: new Date("2026-10-26T12:00:00.000Z"),
    ...overrides,
  };
  return record;
}

function historyRecord(input: {
  id: HistoryEntryId;
  roomId: RoomId;
  itemId: ItemId;
  roundId: RoundId;
  stats?: { readonly voteCount: number; readonly consensus: boolean };
}): AggregatedHistoryRecord {
  return {
    id: input.id,
    roomId: input.roomId,
    itemId: input.itemId,
    roundId: input.roundId,
    dominantSuit: "♥",
    stats: input.stats ?? { voteCount: 4, consensus: true },
  };
}

async function saveUnlocked(persistence: Persistence, room: PersistedRoomRecord): Promise<void> {
  const result = await persistence.transaction({}, async (repos) => {
    await repos.rooms.save(room);
    return ok(true);
  });
  expect(result).toEqual(ok(true));
}

async function readRoom(persistence: Persistence, id: RoomId): Promise<PersistedRoomRecord | null> {
  const result = await persistence.transaction({}, async (repos) => ok(await repos.rooms.findById(id)));
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

async function readByCode(persistence: Persistence, code: RoomCode): Promise<PersistedRoomRecord | null> {
  const result = await persistence.transaction({}, async (repos) => ok(await repos.rooms.findByCode(code)));
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

async function readHistory(persistence: Persistence, id: HistoryEntryId): Promise<AggregatedHistoryRecord | null> {
  const result = await persistence.transaction({}, async (repos) => ok(await repos.history.findById(id)));
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

async function hasProcessed(persistence: Persistence, actorId: ParticipantId, clientOpId: ClientOpId): Promise<boolean> {
  const result = await persistence.transaction({}, async (repos) =>
    ok(await repos.idempotency.hasProcessed(actorId, clientOpId, new Date("2026-10-26T12:00:00.000Z"))),
  );
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

function errNotFound(): Result<never, AppError> {
  return errResult("NOT_FOUND");
}

function errResult(code: AppError["code"]): Result<never, AppError> {
  return { ok: false, error: createAppError(code) };
}

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: (value: T) => void = () => {
    throw new Error("deferred resolve is not ready");
  };
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out waiting for the locked transaction to start");
}
