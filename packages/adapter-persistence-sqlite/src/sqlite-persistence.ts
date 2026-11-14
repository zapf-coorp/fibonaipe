import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SqliteStatement } from "node:sqlite";
import { ok, type AppError, type ClientOpId, type ParticipantId, type Result, type RoomId, type TeamId, type UserId } from "@fibonaipe/domain";
import type { AggregatedHistoryRecord, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, InviteRepository, MembershipRepository, Persistence, PersistedInviteRecord, PersistedMembershipRecord, PersistedRoomRecord, PersistedSprintRecord, PersistedTeamRecord, PersistedTeamTaskRecord, PersistedUserRecord, RoomRepository, TransactionOptions, TransactionRepos } from "@fibonaipe/application";
import { SCHEMA, ensureSprintStateColumn, ensureIdentitySchema, ensureHistorySchema, ensureTeamTaskLink, ensurePlanningColumn } from "./sqlite-schema.js";
import { roomFromRow, idempotencyFromRow, historyFromRow, auditFromRow, teamFromRow, sprintFromRow, userFromRow, membershipFromRow, inviteFromRow, historyDetail, planningJson, asRecords, text, integer } from "./sqlite-mappers.js";

export const localSqlitePath = "data/local.sqlite";

interface MemoryStore {
  holidays: Map<string, Parameters<HolidayRepository["save"]>[0]>;
  rooms: Map<string, PersistedRoomRecord>;
  idempotency: Map<string, IdempotencyRecord>;
  teams: Map<string, PersistedTeamRecord>;
  teamTasks: Map<string, PersistedTeamTaskRecord>;
  memberships: Map<string, PersistedMembershipRecord>;
  invites: Map<string, PersistedInviteRecord>;
  history: Map<string, AggregatedHistoryRecord>;
  audits: Map<string, EstimateAuditRecord>;
  sprints: Map<string, PersistedSprintRecord>;
  users: Map<string, PersistedUserRecord>;
}

interface DirtySet {
  holidays: Set<string>;
  rooms: Set<string>;
  deletedRooms: Set<string>;
  idempotency: Set<string>;
  teams: Set<string>;
  teamTasks: Set<string>;
  memberships: Set<string>;
  invites: Set<string>;
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
  ensurePlanningColumn(db);
  ensureSprintStateColumn(db);
  ensureIdentitySchema(db);
  ensureHistorySchema(db);
  ensureTeamTaskLink(db);
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
    const lockKey = options.lockTeamId ? `team:${options.lockTeamId}` : options.lockRoomId ? `room:${options.lockRoomId}` : undefined;
    const release = lockKey ? await this.acquireLock(lockKey) : undefined;
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
    for (const row of asRecords(this.statements.teamTasksAll.all())) {
      const task = {
        id: text(row, "id"),
        teamId: text(row, "team_id") as TeamId,
        title: text(row, "title"),
        sprintName: text(row, "sprint_name"),
        link: text(row, "link"),
        number: integer(row, "task_number"),
      };
      store.teamTasks.set(task.id, task);
    }
    for (const row of asRecords(this.statements.membershipsAll.all())) {
      const record = membershipFromRow(row);
      store.memberships.set(membershipKey(record.userId, record.teamId), record);
    }
    for (const row of asRecords(this.statements.invitesAll.all())) {
      const record = inviteFromRow(row);
      store.invites.set(record.id, record);
    }
    for (const row of asRecords(this.statements.holidaysAll.all())) {
      const holiday = { id: text(row, "id") as import("@fibonaipe/domain").HolidayId, teamId: text(row, "team_id") as TeamId, date: text(row, "date"), name: text(row, "name") };
      store.holidays.set(holiday.id, holiday);
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
            entry.teamId ?? null,
            historyDetail(entry),
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
        if (team) this.statements.upsertTeam.run(team.id, team.name, team.organizationId ?? "org-mvp");
        else this.statements.deleteTeam.run(id);
      }
      for (const id of dirty.teamTasks) {
        const task = working.teamTasks.get(id);
        if (task) this.statements.upsertTeamTask.run(task.id, task.teamId, task.title, task.sprintName, task.link, task.number);
        else this.statements.deleteTeamTask.run(id);
      }
      for (const key of dirty.memberships) {
        const membership = working.memberships.get(key);
        if (membership) this.statements.upsertMembership.run(membership.userId, membership.teamId, membership.role);
        else this.statements.deleteMembership.run(...membershipKeyParts(key));
      }
      for (const id of dirty.invites) {
        const invite = working.invites.get(id);
        if (invite) {
          this.statements.upsertInvite.run(
            invite.id,
            invite.teamId,
            invite.role,
            invite.tokenHash,
            invite.expiresAt.toISOString(),
            invite.revokedAt === null ? null : invite.revokedAt.toISOString(),
            invite.acceptedBy,
          );
        }
      }
      for (const id of dirty.holidays) {
        const holiday = working.holidays.get(id);
        if (holiday) this.statements.upsertHoliday.run(holiday.id, holiday.teamId, holiday.date, holiday.name);
        else this.statements.deleteHoliday.run(id);
      }
      for (const id of dirty.sprints) {
        const sprint = working.sprints.get(id);
        if (sprint) this.statements.upsertSprint.run(sprint.id, sprint.teamId, sprint.name, sprint.state === undefined ? null : JSON.stringify(sprint.state));
      }
      for (const id of dirty.users) {
        const user = working.users.get(id);
        if (user) {
          this.statements.upsertUser.run(
            user.id,
            user.email,
            user.displayName,
            user.status ?? "active",
            user.isSuperAdmin === true ? 1 : 0,
            user.locale ?? "pt-BR",
            user.theme ?? "system",
          );
        } else this.statements.deleteUser.run(id);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

interface Statements {
  holidaysAll: SqliteStatement;
  upsertHoliday: SqliteStatement;
  deleteHoliday: SqliteStatement;
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
  deleteTeam: SqliteStatement;
  teamTasksAll: SqliteStatement;
  upsertTeamTask: SqliteStatement;
  deleteTeamTask: SqliteStatement;
  membershipsAll: SqliteStatement;
  upsertMembership: SqliteStatement;
  deleteMembership: SqliteStatement;
  invitesAll: SqliteStatement;
  upsertInvite: SqliteStatement;
  sprintsAll: SqliteStatement;
  upsertSprint: SqliteStatement;
  usersAll: SqliteStatement;
  upsertUser: SqliteStatement;
  deleteUser: SqliteStatement;
}

function prepare(db: DatabaseSync): Statements {
  return {
    holidaysAll: db.prepare("SELECT id, team_id, date, name FROM holidays"),
    upsertHoliday: db.prepare("INSERT INTO holidays (id, team_id, date, name) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET team_id = excluded.team_id, date = excluded.date, name = excluded.name"),
    deleteHoliday: db.prepare("DELETE FROM holidays WHERE id = ?"),
    ping: db.prepare("SELECT 1 AS ok"),
    roomsAll: db.prepare("SELECT * FROM rooms"),
    deleteRoom: db.prepare("DELETE FROM rooms WHERE id = ?"),
    upsertRoom: db.prepare(
      `INSERT INTO rooms (id, code, name, kind, team_id, status, version, items_json, planning_json, expires_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         code = excluded.code,
         name = excluded.name,
         kind = excluded.kind,
         team_id = excluded.team_id,
         status = excluded.status,
         version = excluded.version,
         items_json = excluded.items_json,
         planning_json = excluded.planning_json,
         expires_at = excluded.expires_at,
         last_activity_at = excluded.last_activity_at`,
    ),
    idempotencyAll: db.prepare("SELECT actor_id, client_op_id, processed_at FROM idempotency_keys"),
    upsertIdempotency: db.prepare(
      `INSERT INTO idempotency_keys (actor_id, client_op_id, processed_at) VALUES (?, ?, ?)
       ON CONFLICT(actor_id, client_op_id) DO UPDATE SET processed_at = excluded.processed_at`,
    ),
    historyAll: db.prepare(
      "SELECT id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json FROM history_entries",
    ),
    upsertHistory: db.prepare(
      `INSERT INTO history_entries (id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         room_id = excluded.room_id,
         item_id = excluded.item_id,
         round_id = excluded.round_id,
         dominant_suit = excluded.dominant_suit,
         vote_count = excluded.vote_count,
         consensus = excluded.consensus,
         team_id = excluded.team_id,
         detail_json = excluded.detail_json`,
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
    teamTasksAll: db.prepare("SELECT id, team_id, title, sprint_name, link, task_number FROM team_tasks"),
    upsertTeamTask: db.prepare(
      `INSERT INTO team_tasks (id, team_id, title, sprint_name, link, task_number) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET team_id = excluded.team_id, title = excluded.title, sprint_name = excluded.sprint_name, link = excluded.link, task_number = excluded.task_number`,
    ),
    deleteTeamTask: db.prepare("DELETE FROM team_tasks WHERE id = ?"),
    teamsAll: db.prepare("SELECT id, name, organization_id FROM teams"),
    upsertTeam: db.prepare(
      `INSERT INTO teams (id, name, organization_id) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, organization_id = excluded.organization_id`,
    ),
    deleteTeam: db.prepare("DELETE FROM teams WHERE id = ?"),
    membershipsAll: db.prepare("SELECT user_id, team_id, role FROM memberships"),
    upsertMembership: db.prepare(
      `INSERT INTO memberships (user_id, team_id, role) VALUES (?, ?, ?)
       ON CONFLICT(user_id, team_id) DO UPDATE SET role = excluded.role`,
    ),
    deleteMembership: db.prepare("DELETE FROM memberships WHERE user_id = ? AND team_id = ?"),
    invitesAll: db.prepare("SELECT id, team_id, role, token_hash, expires_at, revoked_at, accepted_by FROM invites"),
    upsertInvite: db.prepare(
      `INSERT INTO invites (id, team_id, role, token_hash, expires_at, revoked_at, accepted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         team_id = excluded.team_id,
         role = excluded.role,
         token_hash = excluded.token_hash,
         expires_at = excluded.expires_at,
         revoked_at = excluded.revoked_at,
         accepted_by = excluded.accepted_by`,
    ),
    sprintsAll: db.prepare("SELECT id, team_id, name, state_json FROM sprints"),
    upsertSprint: db.prepare(
      `INSERT INTO sprints (id, team_id, name, state_json) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET team_id = excluded.team_id, name = excluded.name, state_json = excluded.state_json`,
    ),
    usersAll: db.prepare("SELECT id, email, display_name, status, is_super_admin, locale, theme FROM users"),
    upsertUser: db.prepare(
      `INSERT INTO users (id, email, display_name, status, is_super_admin, locale, theme) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         status = excluded.status,
         is_super_admin = excluded.is_super_admin,
         locale = excluded.locale,
         theme = excluded.theme`,
    ),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
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
    planningJson(room),
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
      async delete(id) {
        working.teams.delete(id);
        dirty.teams.add(id);
      },
    },
    teamTasks: {
      async listByTeam(teamId) {
        return [...working.teamTasks.values()].filter((task) => task.teamId === teamId).map(cloneData);
      },
      async save(task) {
        working.teamTasks.set(task.id, cloneData(task));
        dirty.teamTasks.add(task.id);
      },
      async delete(id) {
        working.teamTasks.delete(id);
        dirty.teamTasks.add(id);
      },
      async deleteByTeam(teamId) {
        for (const [id, task] of [...working.teamTasks]) {
          if (task.teamId !== teamId) continue;
          working.teamTasks.delete(id);
          dirty.teamTasks.add(id);
        }
      },
    },
    memberships: membershipRepos(working, dirty),
    invites: inviteRepos(working, dirty),
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
    holidays: {
      async listByTeam(teamId) { return [...working.holidays.values()].filter((holiday) => holiday.teamId === teamId).map(cloneData); },
      async save(holiday) { working.holidays.set(holiday.id, cloneData(holiday)); dirty.holidays.add(holiday.id); },
      async delete(id) { working.holidays.delete(id); dirty.holidays.add(id); },
    },
    sprints: {
      async findById(id) {
        return cloneOptional(working.sprints.get(id));
      },
      async listByTeam(teamId) {
        return [...working.sprints.values()].filter((sprint) => sprint.teamId === teamId).map(cloneData);
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
      async findByEmail(email) {
        const normalized = email.trim().toLowerCase();
        for (const user of working.users.values()) {
          if (user.email.trim().toLowerCase() === normalized) return cloneData(user);
        }
        return null;
      },
      async save(user) {
        const copy = cloneData(user);
        working.users.set(copy.id, copy);
        dirty.users.add(copy.id);
      },
      async delete(id) {
        working.users.delete(id);
        dirty.users.add(id);
      },
    },
  };
}

function membershipKey(userId: UserId, teamId: TeamId): string {
  return `${userId}\u0000${teamId}`;
}

function membershipKeyParts(key: string): [string, string] {
  const separator = key.indexOf("\u0000");
  return [key.slice(0, separator), key.slice(separator + 1)];
}

function membershipRepos(working: MemoryStore, dirty: DirtySet): MembershipRepository {
  return {
    async listByTeam(teamId) {
      return [...working.memberships.values()].filter((record) => record.teamId === teamId).map((record) => cloneData(record));
    },
    async listByUser(userId) {
      return [...working.memberships.values()].filter((record) => record.userId === userId).map((record) => cloneData(record));
    },
    async save(membership) {
      const copy = cloneData(membership);
      const key = membershipKey(copy.userId, copy.teamId);
      working.memberships.set(key, copy);
      dirty.memberships.add(key);
    },
    async delete(userId, teamId) {
      const key = membershipKey(userId, teamId);
      working.memberships.delete(key);
      dirty.memberships.add(key);
    },
  };
}

function inviteRepos(working: MemoryStore, dirty: DirtySet): InviteRepository {
  return {
    async save(invite) {
      const copy = cloneData(invite);
      working.invites.set(copy.id, copy);
      dirty.invites.add(copy.id);
    },
    async findByTokenHash(tokenHash) {
      for (const invite of working.invites.values()) {
        if (invite.tokenHash === tokenHash) return cloneData(invite);
      }
      return null;
    },
  };
}

function matchesHistory(record: AggregatedHistoryRecord, filter: HistoryQuery): boolean {
  if (filter.roomId !== undefined && record.roomId !== filter.roomId) return false;
  if (filter.itemId !== undefined && record.itemId !== filter.itemId) return false;
  if (filter.teamId !== undefined && record.teamId !== filter.teamId) return false;
  return true;
}

function idempotencyKey(actorId: ParticipantId, clientOpId: ClientOpId): string {
  return `${actorId}\u0000${clientOpId}`;
}

function emptyStore(): MemoryStore {
  return {
    holidays: new Map(),
    rooms: new Map(),
    idempotency: new Map(),
    teams: new Map(),
    teamTasks: new Map(),
    memberships: new Map(),
    invites: new Map(),
    history: new Map(),
    audits: new Map(),
    sprints: new Map(),
    users: new Map(),
  };
}

function emptyDirty(): DirtySet {
  return {
    holidays: new Set(),
    rooms: new Set(),
    deletedRooms: new Set(),
    idempotency: new Set(),
    teams: new Set(),
    teamTasks: new Set(),
    memberships: new Set(),
    invites: new Set(),
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
