import { ok, type AppError, type ClientOpId, type ParticipantId, type Result, type RoomId } from "@fibonaipe/domain";
import type {
  AggregatedHistoryRecord,
  EstimateAuditRecord,
  HistoryQuery,
  IdempotencyRecord,
  Persistence,
  PersistedRoomRecord,
  PersistedSprintRecord,
  PersistedTeamRecord,
  PersistedUserRecord,
  RoomRepository,
  TransactionOptions,
  TransactionRepos,
} from "@fibonaipe/application";

interface MemoryStore {
  rooms: Map<string, PersistedRoomRecord>;
  idempotency: Map<string, IdempotencyRecord>;
  teams: Map<string, PersistedTeamRecord>;
  history: Map<string, AggregatedHistoryRecord>;
  audits: Map<string, EstimateAuditRecord>;
  sprints: Map<string, PersistedSprintRecord>;
  users: Map<string, PersistedUserRecord>;
}

interface DirtySet {
  rooms: Set<string>;
  deletedRooms: Set<string>;
  idempotency: Set<string>;
  teams: Set<string>;
  history: Set<string>;
  audits: Set<string>;
  sprints: Set<string>;
  users: Set<string>;
}

export class InMemoryPersistence implements Persistence {
  private readonly store: MemoryStore = emptyStore();
  private readonly lockTails = new Map<string, Promise<void>>();

  async ping(): Promise<Result<{ ok: true }, AppError>> {
    return ok({ ok: true });
  }

  async transaction<T>(
    options: TransactionOptions,
    work: (repos: TransactionRepos) => Promise<Result<T, AppError>>,
  ): Promise<Result<T, AppError>> {
    const release = options.lockRoomId ? await this.acquireLock(options.lockRoomId) : undefined;
    const working = cloneStore(this.store);
    const dirty = emptyDirty();
    const lockedId = options.lockRoomId;
    const previousVersion = lockedId ? this.store.rooms.get(lockedId)?.version : undefined;
    let savedLockedRoom = false;
    const repos = createRepos(working, dirty, lockedId, () => {
      savedLockedRoom = true;
    });
    try {
      const result = await work(repos);
      if (result.ok) {
        // A locked update ignores the version written by the callback and stores previous + 1.
        // An insert keeps the caller-supplied version. Dirty keys are patched onto the latest
        // store so a commit for another room is not replaced by this transaction's snapshot.
        if (lockedId && savedLockedRoom && previousVersion !== undefined && !dirty.deletedRooms.has(lockedId)) {
          const current = working.rooms.get(lockedId);
          if (current) working.rooms.set(lockedId, { ...current, version: previousVersion + 1 });
        }
        this.apply(working, dirty);
      }
      return result;
    } finally {
      release?.();
    }
  }

  private acquireLock(roomId: string): Promise<() => void> {
    const previous = this.lockTails.get(roomId) ?? Promise.resolve();
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.lockTails.set(
      roomId,
      previous.then(() => gate),
    );
    return previous.then(() => release);
  }

  private apply(working: MemoryStore, dirty: DirtySet): void {
    for (const id of dirty.deletedRooms) this.store.rooms.delete(id);
    for (const id of dirty.rooms) {
      if (dirty.deletedRooms.has(id)) continue;
      const room = working.rooms.get(id);
      if (room) this.store.rooms.set(id, room);
    }
    patch(this.store.idempotency, working.idempotency, dirty.idempotency);
    patch(this.store.teams, working.teams, dirty.teams);
    patch(this.store.history, working.history, dirty.history);
    patch(this.store.audits, working.audits, dirty.audits);
    patch(this.store.sprints, working.sprints, dirty.sprints);
    patch(this.store.users, working.users, dirty.users);
  }
}

function createRepos(
  working: MemoryStore,
  dirty: DirtySet,
  lockedId: RoomId | undefined,
  onLockedSave: () => void,
): TransactionRepos {
  const rooms: RoomRepository = {
    async findById(id) {
      return cloneOptional(working.rooms.get(id));
    },
    async findByCode(code) {
      for (const room of working.rooms.values()) {
        if (room.code === code) return cloneData(room);
      }
      return null;
    },
    async save(room) {
      const copy = cloneData(room);
      working.rooms.set(copy.id, copy);
      dirty.rooms.add(copy.id);
      dirty.deletedRooms.delete(copy.id);
      if (lockedId !== undefined && copy.id === lockedId) onLockedSave();
    },
    async deleteExpiredAnonymous(before) {
      for (const [id, room] of [...working.rooms]) {
        if (room.kind !== "guest" || room.expiresAt === null) continue;
        if (room.expiresAt.getTime() <= before.getTime()) {
          working.rooms.delete(id);
          dirty.deletedRooms.add(id);
          dirty.rooms.add(id);
        }
      }
    },
  };

  return {
    rooms,
    idempotency: {
      async hasProcessed(actorId, clientOpId, _now) {
        return working.idempotency.has(idempotencyKey(actorId, clientOpId));
      },
      async record(actorId, clientOpId, now) {
        const key = idempotencyKey(actorId, clientOpId);
        if (working.idempotency.has(key)) return;
        working.idempotency.set(key, { actorId, clientOpId, processedAt: cloneData(now) });
        dirty.idempotency.add(key);
      },
    },
    teams: {
      async findById(id) {
        return cloneOptional(working.teams.get(id));
      },
      async save(team) {
        const copy = cloneData(team);
        working.teams.set(copy.id, copy);
        dirty.teams.add(copy.id);
      },
    },
    history: {
      async appendAggregated(entry) {
        const copy = cloneData(entry);
        working.history.set(copy.id, copy);
        dirty.history.add(copy.id);
      },
      async query(filter) {
        return [...working.history.values()]
          .filter((record) => matchesHistory(record, filter))
          .map((record) => cloneData(record));
      },
      async findById(id) {
        return cloneOptional(working.history.get(id));
      },
      async saveAudit(audit) {
        const copy = cloneData(audit);
        working.audits.set(copy.id, copy);
        dirty.audits.add(copy.id);
      },
    },
    sprints: {
      async findById(id) {
        return cloneOptional(working.sprints.get(id));
      },
      async save(sprint) {
        const copy = cloneData(sprint);
        working.sprints.set(copy.id, copy);
        dirty.sprints.add(copy.id);
      },
    },
    users: {
      async findById(id) {
        return cloneOptional(working.users.get(id));
      },
      async save(user) {
        const copy = cloneData(user);
        working.users.set(copy.id, copy);
        dirty.users.add(copy.id);
      },
    },
  };
}

function matchesHistory(record: AggregatedHistoryRecord, filter: HistoryQuery): boolean {
  if (record.roomId !== filter.roomId) return false;
  if (filter.itemId !== undefined && record.itemId !== filter.itemId) return false;
  return true;
}

function idempotencyKey(actorId: ParticipantId, clientOpId: ClientOpId): string {
  return `${actorId}\u0000${clientOpId}`;
}

function patch<T>(target: Map<string, T>, source: Map<string, T>, dirty: Set<string>): void {
  for (const key of dirty) {
    const value = source.get(key);
    if (value !== undefined) target.set(key, value);
  }
}

function emptyStore(): MemoryStore {
  return {
    rooms: new Map(),
    idempotency: new Map(),
    teams: new Map(),
    history: new Map(),
    audits: new Map(),
    sprints: new Map(),
    users: new Map(),
  };
}

function emptyDirty(): DirtySet {
  return {
    rooms: new Set(),
    deletedRooms: new Set(),
    idempotency: new Set(),
    teams: new Set(),
    history: new Set(),
    audits: new Set(),
    sprints: new Set(),
    users: new Set(),
  };
}

function cloneStore(store: MemoryStore): MemoryStore {
  return {
    rooms: cloneMap(store.rooms),
    idempotency: cloneMap(store.idempotency),
    teams: cloneMap(store.teams),
    history: cloneMap(store.history),
    audits: cloneMap(store.audits),
    sprints: cloneMap(store.sprints),
    users: cloneMap(store.users),
  };
}

function cloneMap<T>(source: Map<string, T>): Map<string, T> {
  const copy = new Map<string, T>();
  for (const [key, value] of source) copy.set(key, cloneData(value));
  return copy;
}

function cloneOptional<T>(value: T | undefined): T | null {
  return value === undefined ? null : cloneData(value);
}

function cloneData<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((item) => cloneData(item)) as T;
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    copy[key] = cloneData((value as Record<string, unknown>)[key]);
  }
  return copy as T;
}
