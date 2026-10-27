import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SqliteStatement } from "node:sqlite";
import { ok, type AppError, type ClientOpId, type ParticipantId, type Result, type RoomId } from "@fibonaipe/domain";
import type {
  AggregatedHistoryRecord,
  EstimateAuditRecord,
  HistoryQuery,
  IdempotencyRecord,
  Persistence,
  PersistedRoomItem,
  PersistedRoomRecord,
  PersistedSprintRecord,
  PersistedTeamRecord,
  PersistedUserRecord,
  RoomRepository,
  TransactionOptions,
  TransactionRepos,
} from "@fibonaipe/application";

/** Gitignored file used when a long-lived local stand-in is opened on purpose. Tests use `:memory:`. */
export const localSqlitePath = "data/local.sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  team_id TEXT,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  items_json TEXT NOT NULL,
  expires_at TEXT,
  last_activity_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS idempotency_keys (
  actor_id TEXT NOT NULL,
  client_op_id TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  PRIMARY KEY (actor_id, client_op_id)
);
CREATE TABLE IF NOT EXISTS history_entries (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  dominant_suit TEXT NOT NULL,
  vote_count INTEGER NOT NULL,
  consensus INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS estimate_audits (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  at TEXT NOT NULL,
  from_label TEXT,
  to_label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL
);
`;

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

export type SqlitePersistence = Persistence & { close(): void };

export function createSqlitePersistence(filename: string = ":memory:"): SqlitePersistence {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA);
  return new SqlitePersistenceStore(db);
}

class SqlitePersistenceStore implements Persistence {
  private readonly lockTails = new Map<string, Promise<void>>();
  private readonly statements: Statements;

  constructor(private readonly db: DatabaseSync) {
    this.statements = prepare(db);
  }

  close(): void {
    this.db.close();
  }

  async ping(): Promise<Result<{ ok: true }, AppError>> {
    this.statements.ping.get();
    return ok({ ok: true });
  }

  async transaction<T>(
    options: TransactionOptions,
    work: (repos: TransactionRepos) => Promise<Result<T, AppError>>,
  ): Promise<Result<T, AppError>> {
    const release = options.lockRoomId ? await this.acquireLock(options.lockRoomId) : undefined;
    const working = this.loadStore();
    const dirty = emptyDirty();
    const lockedId = options.lockRoomId;
    const previousVersion = lockedId ? working.rooms.get(lockedId)?.version : undefined;
    let savedLockedRoom = false;
    const repos = createRepos(working, dirty, lockedId, () => {
      savedLockedRoom = true;
    });
    try {
      const result = await work(repos);
      if (result.ok) {
        if (lockedId && savedLockedRoom && previousVersion !== undefined && !dirty.deletedRooms.has(lockedId)) {
          const current = working.rooms.get(lockedId);
          if (current) working.rooms.set(lockedId, { ...current, version: previousVersion + 1 });
        }
        this.persist(working, dirty);
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

  private loadStore(): MemoryStore {
    const store = emptyStore();
    for (const row of asRecords(this.statements.roomsAll.all())) {
      const room = roomFromRow(row);
      store.rooms.set(room.id, room);
    }
    for (const row of asRecords(this.statements.idempotencyAll.all())) {
      const record = idempotencyFromRow(row);
      store.idempotency.set(idempotencyKey(record.actorId, record.clientOpId), record);
    }
    for (const row of asRecords(this.statements.historyAll.all())) {
      const record = historyFromRow(row);
      store.history.set(record.id, record);
    }
    for (const row of asRecords(this.statements.auditsAll.all())) {
      const record = auditFromRow(row);
      store.audits.set(record.id, record);
    }
    for (const row of asRecords(this.statements.teamsAll.all())) {
      const record = teamFromRow(row);
      store.teams.set(record.id, record);
    }
    for (const row of asRecords(this.statements.sprintsAll.all())) {
      const record = sprintFromRow(row);
      store.sprints.set(record.id, record);
    }
    for (const row of asRecords(this.statements.usersAll.all())) {
      const record = userFromRow(row);
      store.users.set(record.id, record);
    }
    return store;
  }

  private persist(working: MemoryStore, dirty: DirtySet): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const id of dirty.deletedRooms) this.statements.deleteRoom.run(id);
      for (const id of dirty.rooms) {
        if (dirty.deletedRooms.has(id)) continue;
        const room = working.rooms.get(id);
        if (room) writeRoom(this.statements, room);
      }
      for (const key of dirty.idempotency) {
        const record = working.idempotency.get(key);
        if (record) {
          this.statements.upsertIdempotency.run(record.actorId, record.clientOpId, record.processedAt.toISOString());
        }
      }
      for (const id of dirty.history) {
        const entry = working.history.get(id);
        if (entry) {
          this.statements.upsertHistory.run(
            entry.id,
            entry.roomId,
            entry.itemId,
            entry.roundId,
            entry.dominantSuit,
            entry.stats.voteCount,
            entry.stats.consensus ? 1 : 0,
          );
        }
      }
      for (const id of dirty.audits) {
        const audit = working.audits.get(id);
        if (audit) {
          this.statements.upsertAudit.run(
            audit.id,
            audit.roomId,
            audit.itemId,
            audit.changedBy,
            audit.at.toISOString(),
            audit.from,
            audit.to,
          );
        }
      }
      for (const id of dirty.teams) {
        const team = working.teams.get(id);
        if (team) this.statements.upsertTeam.run(team.id, team.name);
      }
      for (const id of dirty.sprints) {
        const sprint = working.sprints.get(id);
        if (sprint) this.statements.upsertSprint.run(sprint.id, sprint.teamId, sprint.name);
      }
      for (const id of dirty.users) {
        const user = working.users.get(id);
        if (user) this.statements.upsertUser.run(user.id, user.email, user.displayName);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

interface Statements {
  ping: SqliteStatement;
  roomsAll: SqliteStatement;
  deleteRoom: SqliteStatement;
  upsertRoom: SqliteStatement;
  idempotencyAll: SqliteStatement;
  upsertIdempotency: SqliteStatement;
  historyAll: SqliteStatement;
  upsertHistory: SqliteStatement;
  auditsAll: SqliteStatement;
  upsertAudit: SqliteStatement;
  teamsAll: SqliteStatement;
  upsertTeam: SqliteStatement;
  sprintsAll: SqliteStatement;
  upsertSprint: SqliteStatement;
  usersAll: SqliteStatement;
  upsertUser: SqliteStatement;
}

function prepare(db: DatabaseSync): Statements {
  return {
    ping: db.prepare("SELECT 1 AS ok"),
    roomsAll: db.prepare("SELECT * FROM rooms"),
    deleteRoom: db.prepare("DELETE FROM rooms WHERE id = ?"),
    upsertRoom: db.prepare(
      `INSERT INTO rooms (id, code, name, kind, team_id, status, version, items_json, expires_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         code = excluded.code,
         name = excluded.name,
         kind = excluded.kind,
         team_id = excluded.team_id,
         status = excluded.status,
         version = excluded.version,
         items_json = excluded.items_json,
         expires_at = excluded.expires_at,
         last_activity_at = excluded.last_activity_at`,
    ),
    idempotencyAll: db.prepare("SELECT actor_id, client_op_id, processed_at FROM idempotency_keys"),
    upsertIdempotency: db.prepare(
      `INSERT INTO idempotency_keys (actor_id, client_op_id, processed_at) VALUES (?, ?, ?)
       ON CONFLICT(actor_id, client_op_id) DO UPDATE SET processed_at = excluded.processed_at`,
    ),
    historyAll: db.prepare(
      "SELECT id, room_id, item_id, round_id, dominant_suit, vote_count, consensus FROM history_entries",
    ),
    upsertHistory: db.prepare(
      `INSERT INTO history_entries (id, room_id, item_id, round_id, dominant_suit, vote_count, consensus)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         room_id = excluded.room_id,
         item_id = excluded.item_id,
         round_id = excluded.round_id,
         dominant_suit = excluded.dominant_suit,
         vote_count = excluded.vote_count,
         consensus = excluded.consensus`,
    ),
    auditsAll: db.prepare("SELECT id, room_id, item_id, changed_by, at, from_label, to_label FROM estimate_audits"),
    upsertAudit: db.prepare(
      `INSERT INTO estimate_audits (id, room_id, item_id, changed_by, at, from_label, to_label)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         room_id = excluded.room_id,
         item_id = excluded.item_id,
         changed_by = excluded.changed_by,
         at = excluded.at,
         from_label = excluded.from_label,
         to_label = excluded.to_label`,
    ),
    teamsAll: db.prepare("SELECT id, name FROM teams"),
    upsertTeam: db.prepare(
      `INSERT INTO teams (id, name) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    ),
    sprintsAll: db.prepare("SELECT id, team_id, name FROM sprints"),
    upsertSprint: db.prepare(
      `INSERT INTO sprints (id, team_id, name) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET team_id = excluded.team_id, name = excluded.name`,
    ),
    usersAll: db.prepare("SELECT id, email, display_name FROM users"),
    upsertUser: db.prepare(
      `INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name`,
    ),
  };
}

function writeRoom(statements: Statements, room: PersistedRoomRecord): void {
  statements.upsertRoom.run(
    room.id,
    room.code,
    room.name,
    room.kind,
    room.teamId,
    room.status,
    room.version,
    JSON.stringify(room.items.map((item) => ({ id: item.id, title: item.title }))),
    room.expiresAt === null ? null : room.expiresAt.toISOString(),
    room.lastActivityAt.toISOString(),
  );
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
      let removed = 0;
      for (const [id, room] of [...working.rooms]) {
        if (room.kind !== "guest" || room.expiresAt === null) continue;
        if (room.expiresAt.getTime() <= before.getTime()) {
          working.rooms.delete(id);
          dirty.deletedRooms.add(id);
          dirty.rooms.add(id);
          removed += 1;
        }
      }
      return removed;
    },
  };

  return {
    rooms,
    idempotency: {
      async hasProcessed(actorId, clientOpId) {
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
        return [...working.history.values()].filter((record) => matchesHistory(record, filter)).map((record) => cloneData(record));
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

function roomFromRow(row: Record<string, unknown>): PersistedRoomRecord {
  return {
    id: text(row, "id") as PersistedRoomRecord["id"],
    code: text(row, "code") as PersistedRoomRecord["code"],
    name: text(row, "name"),
    kind: kindOf(text(row, "kind")),
    teamId: row.team_id === null ? null : (text(row, "team_id") as PersistedRoomRecord["teamId"]),
    status: statusOf(text(row, "status")),
    version: integer(row, "version"),
    items: itemsOf(text(row, "items_json")),
    expiresAt: row.expires_at === null ? null : new Date(text(row, "expires_at")),
    lastActivityAt: new Date(text(row, "last_activity_at")),
  };
}

function idempotencyFromRow(row: Record<string, unknown>): IdempotencyRecord {
  return {
    actorId: text(row, "actor_id") as IdempotencyRecord["actorId"],
    clientOpId: text(row, "client_op_id") as IdempotencyRecord["clientOpId"],
    processedAt: new Date(text(row, "processed_at")),
  };
}

function historyFromRow(row: Record<string, unknown>): AggregatedHistoryRecord {
  return {
    id: text(row, "id") as AggregatedHistoryRecord["id"],
    roomId: text(row, "room_id") as AggregatedHistoryRecord["roomId"],
    itemId: text(row, "item_id") as AggregatedHistoryRecord["itemId"],
    roundId: text(row, "round_id") as AggregatedHistoryRecord["roundId"],
    dominantSuit: text(row, "dominant_suit"),
    stats: { voteCount: integer(row, "vote_count"), consensus: integer(row, "consensus") === 1 },
  };
}

function auditFromRow(row: Record<string, unknown>): EstimateAuditRecord {
  return {
    id: text(row, "id") as EstimateAuditRecord["id"],
    roomId: text(row, "room_id") as EstimateAuditRecord["roomId"],
    itemId: text(row, "item_id") as EstimateAuditRecord["itemId"],
    changedBy: text(row, "changed_by") as EstimateAuditRecord["changedBy"],
    at: new Date(text(row, "at")),
    from: row.from_label === null ? null : text(row, "from_label"),
    to: text(row, "to_label"),
  };
}

function teamFromRow(row: Record<string, unknown>): PersistedTeamRecord {
  return { id: text(row, "id") as PersistedTeamRecord["id"], name: text(row, "name") };
}

function sprintFromRow(row: Record<string, unknown>): PersistedSprintRecord {
  return {
    id: text(row, "id") as PersistedSprintRecord["id"],
    teamId: text(row, "team_id") as PersistedSprintRecord["teamId"],
    name: text(row, "name"),
  };
}

function userFromRow(row: Record<string, unknown>): PersistedUserRecord {
  return {
    id: text(row, "id") as PersistedUserRecord["id"],
    email: text(row, "email"),
    displayName: text(row, "display_name"),
  };
}

function itemsOf(json: string): PersistedRoomItem[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("sqlite room items are malformed");
  return parsed.map((item) => {
    if (!isRecord(item)) throw new Error("sqlite room item is malformed");
    return { id: text(item, "id") as PersistedRoomItem["id"], title: text(item, "title") };
  });
}

function kindOf(value: string): PersistedRoomRecord["kind"] {
  if (value === "guest" || value === "team") return value;
  throw new Error("sqlite room kind is malformed");
}

function statusOf(value: string): PersistedRoomRecord["status"] {
  if (value === "open" || value === "closed") return value;
  throw new Error("sqlite room status is malformed");
}

function asRecords(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((row) => {
    if (!isRecord(row)) throw new Error("sqlite row is malformed");
    return row;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`sqlite column ${key} is malformed`);
  return value;
}

function integer(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`sqlite column ${key} is malformed`);
  return value;
}

function matchesHistory(record: AggregatedHistoryRecord, filter: HistoryQuery): boolean {
  if (record.roomId !== filter.roomId) return false;
  if (filter.itemId !== undefined && record.itemId !== filter.itemId) return false;
  return true;
}

function idempotencyKey(actorId: ParticipantId, clientOpId: ClientOpId): string {
  return `${actorId}\u0000${clientOpId}`;
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
