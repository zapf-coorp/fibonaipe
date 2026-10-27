import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  ok,
  type AppError,
  type HistoryEntryId,
  type ItemId,
  type Result,
  type RoomCode,
  type RoomId,
  type RoundId,
  type SprintId,
  type TeamId,
  type UserId,
} from "@fibonaipe/domain";
import type {
  AggregatedHistoryRecord,
  EstimateAuditRecord,
  HistoryQuery,
  Persistence,
  PersistedRoomRecord,
  PersistedSprintRecord,
  PersistedTeamRecord,
  PersistedUserRecord,
  TransactionOptions,
  TransactionRepos,
} from "@fibonaipe/application";

type Sql = postgres.Sql | postgres.TransactionSql;

interface RoomRow {
  id: string;
  code: string;
  name: string;
  kind: string;
  team_id: string | null;
  status: string;
  version: number | string;
  expires_at: Date | string | null;
  last_activity_at: Date | string;
}

interface ItemRow {
  id: string;
  title: string;
}

interface HistoryRow {
  id: string;
  room_id: string;
  item_id: string;
  round_id: string;
  dominant_suit: string;
  vote_count: number | string;
  consensus: boolean;
}

const pools = new Map<string, postgres.Sql>();
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../migrations");

export function postgresMigrationSql(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"));
}

export async function applyPostgresMigrations(env: { readonly DATABASE_URL: string }): Promise<string[]> {
  const sql = poolFor(env.DATABASE_URL);
  for (const script of postgresMigrationSql()) {
    for (const statement of sqlStatements(script)) {
      await sql.unsafe(statement);
    }
  }
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;
  return rows.map((row) => row.table_name);
}

export function createPostgresPersistence(env: { readonly DATABASE_URL: string }): Persistence {
  const sql = poolFor(env.DATABASE_URL);
  const queues = new Map<string, Promise<void>>();
  return {
    async ping() {
      await sql`select 1`;
      return ok({ ok: true });
    },
    transaction(options, work) {
      const run = () => runTransaction(sql, options, work);
      if (options.lockRoomId === undefined) return run();
      return enqueue(queues, options.lockRoomId, run);
    },
  };
}

function poolFor(databaseUrl: string): postgres.Sql {
  const existing = pools.get(databaseUrl);
  if (existing) return existing;
  const created = postgres(databaseUrl, {
    max: 5,
    idle_timeout: 1,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    prepare: false,
  });
  pools.set(databaseUrl, created);
  return created;
}

function sqlStatements(script: string): string[] {
  return script
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

class RolledBack extends Error {
  readonly result: Result<never, AppError>;

  constructor(result: Result<never, AppError>) {
    super("transaction rolled back");
    this.name = "RolledBack";
    this.result = result;
  }
}

async function runTransaction<T>(
  sql: postgres.Sql,
  options: TransactionOptions,
  work: (repos: TransactionRepos) => Promise<Result<T, AppError>>,
): Promise<Result<T, AppError>> {
  const isolation = options.isolation === "serializable" ? "isolation level serializable" : "isolation level read committed";
  try {
    return await sql.begin(isolation, async (tx) => {
      let lockedVersion: number | null = null;
      if (options.lockRoomId !== undefined) {
        const locked = await tx<{ version: number | string }[]>`
          select version from rooms where id = ${options.lockRoomId} for update
        `;
        const row = locked[0];
        lockedVersion = row ? asNumber(row.version) : null;
      }
      const result = await work(createRepos(tx, options.lockRoomId, lockedVersion));
      if (!result.ok) throw new RolledBack(result);
      return result;
    });
  } catch (error) {
    if (error instanceof RolledBack) return error.result;
    throw error;
  }
}

function enqueue<T>(queues: Map<string, Promise<void>>, key: string, run: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const execution = previous.then(run, run);
  queues.set(
    key,
    execution.then(
      () => undefined,
      () => undefined,
    ),
  );
  return execution;
}

function createRepos(tx: postgres.TransactionSql, lockRoomId: RoomId | undefined, lockedVersion: number | null): TransactionRepos {
  return {
    rooms: {
      findById(id) {
        return findRoom(tx, id);
      },
      findByCode(code) {
        return findRoomByCode(tx, code);
      },
      async save(room) {
        await saveRoom(tx, room, lockRoomId, lockedVersion);
      },
      deleteExpiredAnonymous(before) {
        return deleteExpiredAnonymous(tx, before);
      },
    },
    idempotency: {
      async hasProcessed(actorId, clientOpId, now) {
        void now;
        const rows = await tx<{ actor_id: string }[]>`
          select actor_id from idempotency_keys
          where actor_id = ${actorId} and client_op_id = ${clientOpId}
        `;
        return rows.length > 0;
      },
      async record(actorId, clientOpId, now) {
        await tx`
          insert into idempotency_keys (actor_id, client_op_id, processed_at)
          values (${actorId}, ${clientOpId}, ${now})
          on conflict (actor_id, client_op_id) do nothing
        `;
      },
    },
    history: {
      async appendAggregated(entry) {
        await tx`
          insert into aggregated_history (
            id, room_id, item_id, round_id, dominant_suit, vote_count, consensus
          ) values (
            ${entry.id},
            ${entry.roomId},
            ${entry.itemId},
            ${entry.roundId},
            ${entry.dominantSuit},
            ${entry.stats.voteCount},
            ${entry.stats.consensus}
          )
          on conflict (id) do update set
            room_id = excluded.room_id,
            item_id = excluded.item_id,
            round_id = excluded.round_id,
            dominant_suit = excluded.dominant_suit,
            vote_count = excluded.vote_count,
            consensus = excluded.consensus
        `;
      },
      async query(filter) {
        return queryHistory(tx, filter);
      },
      async findById(id) {
        const rows = await tx<HistoryRow[]>`
          select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus
          from aggregated_history where id = ${id}
        `;
        const row = rows[0];
        return row ? mapHistory(row) : null;
      },
      async saveAudit(audit) {
        await saveAudit(tx, audit);
      },
    },
    teams: {
      async findById(id) {
        const rows = await tx<{ id: string; name: string }[]>`select id, name from teams where id = ${id}`;
        const row = rows[0];
        if (!row) return null;
        return { id: row.id as TeamId, name: row.name };
      },
      async save(team) {
        await saveTeam(tx, team);
      },
    },
    sprints: {
      async findById(id) {
        const rows = await tx<{ id: string; team_id: string; name: string }[]>`
          select id, team_id, name from sprints where id = ${id}
        `;
        const row = rows[0];
        if (!row) return null;
        return { id: row.id as SprintId, teamId: row.team_id as TeamId, name: row.name };
      },
      async save(sprint) {
        await saveSprint(tx, sprint);
      },
    },
    users: {
      async findById(id) {
        const rows = await tx<{ id: string; email: string; display_name: string }[]>`
          select id, email, display_name from users where id = ${id}
        `;
        const row = rows[0];
        if (!row) return null;
        return { id: row.id as UserId, email: row.email, displayName: row.display_name };
      },
      async save(user) {
        await saveUser(tx, user);
      },
    },
  };
}

async function findRoom(tx: Sql, id: RoomId): Promise<PersistedRoomRecord | null> {
  const rows = await tx<RoomRow[]>`
    select id, code, name, kind, team_id, status, version, expires_at, last_activity_at
    from rooms where id = ${id}
  `;
  const row = rows[0];
  if (!row) return null;
  const items = await tx<ItemRow[]>`
    select id, title from items where room_id = ${id} order by position asc
  `;
  return mapRoom(row, items);
}

async function findRoomByCode(tx: Sql, code: RoomCode): Promise<PersistedRoomRecord | null> {
  const rows = await tx<RoomRow[]>`
    select id, code, name, kind, team_id, status, version, expires_at, last_activity_at
    from rooms where code = ${code}
  `;
  const row = rows[0];
  if (!row) return null;
  const items = await tx<ItemRow[]>`
    select id, title from items where room_id = ${row.id} order by position asc
  `;
  return mapRoom(row, items);
}

async function saveRoom(
  tx: Sql,
  room: PersistedRoomRecord,
  lockRoomId: RoomId | undefined,
  lockedVersion: number | null,
): Promise<void> {
  const snapshot = structuredClone(room);
  const version =
    lockRoomId !== undefined && snapshot.id === lockRoomId && lockedVersion !== null
      ? lockedVersion + 1
      : snapshot.version;
  await tx`
    insert into rooms (
      id, code, name, kind, team_id, status, version, expires_at, last_activity_at
    ) values (
      ${snapshot.id},
      ${snapshot.code},
      ${snapshot.name},
      ${snapshot.kind},
      ${snapshot.teamId},
      ${snapshot.status},
      ${version},
      ${snapshot.expiresAt},
      ${snapshot.lastActivityAt}
    )
    on conflict (id) do update set
      code = excluded.code,
      name = excluded.name,
      kind = excluded.kind,
      team_id = excluded.team_id,
      status = excluded.status,
      version = excluded.version,
      expires_at = excluded.expires_at,
      last_activity_at = excluded.last_activity_at
  `;
  await tx`delete from items where room_id = ${snapshot.id}`;
  for (let position = 0; position < snapshot.items.length; position += 1) {
    const item = snapshot.items[position];
    if (!item) continue;
    await tx`
      insert into items (room_id, id, title, position)
      values (${snapshot.id}, ${item.id}, ${item.title}, ${position})
    `;
  }
}

async function deleteExpiredAnonymous(tx: Sql, before: Date): Promise<number> {
  await tx`
    delete from items
    where room_id in (
      select id from rooms
      where kind = 'guest' and expires_at is not null and expires_at <= ${before}
    )
  `;
  await tx`
    delete from aggregated_history
    where room_id in (
      select id from rooms
      where kind = 'guest' and expires_at is not null and expires_at <= ${before}
    )
  `;
  const removed = await tx<{ id: string }[]>`
    delete from rooms
    where kind = 'guest' and expires_at is not null and expires_at <= ${before}
    returning id
  `;
  return removed.length;
}

async function queryHistory(tx: Sql, filter: HistoryQuery): Promise<readonly AggregatedHistoryRecord[]> {
  const rows =
    filter.itemId === undefined
      ? await tx<HistoryRow[]>`
          select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus
          from aggregated_history where room_id = ${filter.roomId}
        `
      : await tx<HistoryRow[]>`
          select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus
          from aggregated_history
          where room_id = ${filter.roomId} and item_id = ${filter.itemId}
        `;
  return rows.map((row) => mapHistory(row));
}

async function saveAudit(tx: Sql, audit: EstimateAuditRecord): Promise<void> {
  await tx`
    insert into estimate_audits (id, room_id, item_id, changed_by, at, from_value, to_value)
    values (
      ${audit.id}, ${audit.roomId}, ${audit.itemId}, ${audit.changedBy}, ${audit.at}, ${audit.from}, ${audit.to}
    )
    on conflict (id) do update set
      room_id = excluded.room_id,
      item_id = excluded.item_id,
      changed_by = excluded.changed_by,
      at = excluded.at,
      from_value = excluded.from_value,
      to_value = excluded.to_value
  `;
}

async function saveTeam(tx: Sql, team: PersistedTeamRecord): Promise<void> {
  await tx`
    insert into teams (id, name) values (${team.id}, ${team.name})
    on conflict (id) do update set name = excluded.name
  `;
}

async function saveSprint(tx: Sql, sprint: PersistedSprintRecord): Promise<void> {
  await tx`
    insert into sprints (id, team_id, name) values (${sprint.id}, ${sprint.teamId}, ${sprint.name})
    on conflict (id) do update set team_id = excluded.team_id, name = excluded.name
  `;
}

async function saveUser(tx: Sql, user: PersistedUserRecord): Promise<void> {
  await tx`
    insert into users (id, email, display_name) values (${user.id}, ${user.email}, ${user.displayName})
    on conflict (id) do update set email = excluded.email, display_name = excluded.display_name
  `;
}

function mapRoom(row: RoomRow, items: readonly ItemRow[]): PersistedRoomRecord {
  return {
    id: row.id as RoomId,
    code: row.code as RoomCode,
    name: row.name,
    kind: row.kind === "team" ? "team" : "guest",
    teamId: row.team_id === null ? null : (row.team_id as TeamId),
    status: row.status === "closed" ? "closed" : "open",
    version: asNumber(row.version),
    items: items.map((item) => ({ id: item.id as ItemId, title: item.title })),
    expiresAt: row.expires_at === null ? null : asDate(row.expires_at),
    lastActivityAt: asDate(row.last_activity_at),
  };
}

function mapHistory(row: HistoryRow): AggregatedHistoryRecord {
  return {
    id: row.id as HistoryEntryId,
    roomId: row.room_id as RoomId,
    itemId: row.item_id as ItemId,
    roundId: row.round_id as RoundId,
    dominantSuit: row.dominant_suit,
    stats: {
      voteCount: asNumber(row.vote_count),
      consensus: row.consensus,
    },
  };
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function asNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}
