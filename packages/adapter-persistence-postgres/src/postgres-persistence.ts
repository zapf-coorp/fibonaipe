import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { ok, type AppError, type Result, type RoomCode, type RoomId, type TeamId } from "@fibonaipe/domain";
import type { AggregatedHistoryRecord, EstimateAuditRecord, HistoryQuery, Persistence, PersistedInviteRecord, PersistedRoomRecord, PersistedSprintRecord, PersistedTeamRecord, PersistedUserRecord, TransactionOptions, TransactionRepos } from "@fibonaipe/application";
import { RoomRow, ItemRow, HistoryRow, mapSprint, MembershipRow, InviteRow, UserRow, mapMembership, mapInvite, mapUser, mapRoom, mapHistory, historyDetail, asNumber } from "./postgres-mappers.js";

type Sql = postgres.Sql | postgres.TransactionSql;

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
      if (options.lockTeamId !== undefined) {
        await tx`select id from teams where id = ${options.lockTeamId} for update`;
      }
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
        const detail = historyDetail(entry);
        await tx`
          insert into aggregated_history (
            id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
          ) values (
            ${entry.id},
            ${entry.roomId},
            ${entry.itemId},
            ${entry.roundId},
            ${entry.dominantSuit},
            ${entry.stats.voteCount},
            ${entry.stats.consensus},
            ${entry.teamId ?? null},
            ${detail}
          )
          on conflict (id) do update set
            room_id = excluded.room_id,
            item_id = excluded.item_id,
            round_id = excluded.round_id,
            dominant_suit = excluded.dominant_suit,
            vote_count = excluded.vote_count,
            consensus = excluded.consensus,
            team_id = excluded.team_id,
            detail_json = excluded.detail_json
        `;
      },
      async query(filter) {
        return queryHistory(tx, filter);
      },
      async findById(id) {
        const rows = await tx<HistoryRow[]>`
          select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
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
        const rows = await tx<{ id: string; name: string; organization_id: string | null }[]>`
          select id, name, organization_id from teams where id = ${id}
        `;
        const row = rows[0];
        if (!row) return null;
        return {
          id: row.id as TeamId,
          name: row.name,
          organizationId: (row.organization_id ?? "org-mvp") as PersistedTeamRecord["organizationId"],
        };
      },
      async save(team) {
        await saveTeam(tx, team);
      },
      async delete(id) {
        await tx`delete from teams where id = ${id}`;
      },
    },
    memberships: {
      async listByTeam(teamId) {
        const rows = await tx<MembershipRow[]>`
          select user_id, team_id, role from memberships where team_id = ${teamId}
        `;
        return rows.map((row) => mapMembership(row));
      },
      async listByUser(userId) {
        const rows = await tx<MembershipRow[]>`
          select user_id, team_id, role from memberships where user_id = ${userId}
        `;
        return rows.map((row) => mapMembership(row));
      },
      async save(membership) {
        await tx`
          insert into memberships (user_id, team_id, role)
          values (${membership.userId}, ${membership.teamId}, ${membership.role})
          on conflict (user_id, team_id) do update set role = excluded.role
        `;
      },
      async delete(userId, teamId) {
        await tx`delete from memberships where user_id = ${userId} and team_id = ${teamId}`;
      },
    },
    invites: {
      async save(invite) {
        await saveInvite(tx, invite);
      },
      async findByTokenHash(tokenHash) {
        const rows = await tx<InviteRow[]>`
          select id, team_id, role, token_hash, expires_at, revoked_at, accepted_by
          from invites where token_hash = ${tokenHash}
        `;
        const row = rows[0];
        return row ? mapInvite(row) : null;
      },
    },
    holidays: {
      async listByTeam(teamId) {
        const rows = await tx<{ id: string; team_id: string; date: string; name: string }[]>`select id, team_id, date::text, name from holidays where team_id = ${teamId} order by date`;
        return rows.map((row) => ({ id: row.id as import("@fibonaipe/domain").HolidayId, teamId: row.team_id as TeamId, date: row.date, name: row.name }));
      },
      async save(holiday) {
        await tx`insert into holidays (id, team_id, date, name) values (${holiday.id}, ${holiday.teamId}, ${holiday.date}, ${holiday.name}) on conflict (id) do update set team_id = excluded.team_id, date = excluded.date, name = excluded.name`;
      },
      async delete(id) { await tx`delete from holidays where id = ${id}`; },
    },
    teamTasks: {
      async listByTeam(teamId) {
        const rows = await tx<{ id: string; team_id: string; title: string; sprint_name: string; link: string; task_number: number }[]>`
          select id, team_id, title, sprint_name, link, task_number from team_tasks where team_id = ${teamId} order by sprint_name, task_number
        `;
        return rows.map((row) => ({
          id: row.id,
          teamId: row.team_id as TeamId,
          title: row.title,
          sprintName: row.sprint_name,
          link: row.link,
          number: Number(row.task_number),
        }));
      },
      async save(task) {
        await tx`
          insert into team_tasks (id, team_id, title, sprint_name, link, task_number)
          values (${task.id}, ${task.teamId}, ${task.title}, ${task.sprintName}, ${task.link}, ${task.number})
          on conflict (id) do update set title = excluded.title, sprint_name = excluded.sprint_name, link = excluded.link, task_number = excluded.task_number
        `;
      },
      async delete(id) { await tx`delete from team_tasks where id = ${id}`; },
      async deleteByTeam(teamId) { await tx`delete from team_tasks where team_id = ${teamId}`; },
    },
    sprints: {
      async listByTeam(teamId) {
        const rows = await tx<{ id: string; team_id: string; name: string; state_json: string | null }[]>`
          select id, team_id, name, state_json::text from sprints where team_id = ${teamId}
        `;
        return rows.map(mapSprint);
      },
      async findById(id) {
        const rows = await tx<{ id: string; team_id: string; name: string; state_json: string | null }[]>`
          select id, team_id, name, state_json::text from sprints where id = ${id}
        `;
        const row = rows[0];
        if (!row) return null;
        return mapSprint(row);
      },
      async save(sprint) {
        await saveSprint(tx, sprint);
      },
    },
    users: {
      async findById(id) {
        const rows = await tx<UserRow[]>`
          select id, email, display_name, status, is_super_admin, locale, theme
          from users where id = ${id}
        `;
        const row = rows[0];
        return row ? mapUser(row) : null;
      },
      async findByEmail(email) {
        const rows = await tx<UserRow[]>`
          select id, email, display_name, status, is_super_admin, locale, theme
          from users where lower(email) = ${email.trim().toLowerCase()}
        `;
        const row = rows[0];
        return row ? mapUser(row) : null;
      },
      async save(user) {
        await saveUser(tx, user);
      },
      async delete(id) {
        await tx`delete from users where id = ${id}`;
      },
    },
  };
}

async function findRoom(tx: Sql, id: RoomId): Promise<PersistedRoomRecord | null> {
  const rows = await tx<RoomRow[]>`
    select id, code, name, kind, team_id, status, version, planning_json::text as planning_json, expires_at, last_activity_at
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
    select id, code, name, kind, team_id, status, version, planning_json::text as planning_json, expires_at, last_activity_at
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
  const planningText = snapshot.planning === undefined ? null : JSON.stringify(snapshot.planning);
  await tx`
    insert into rooms (
      id, code, name, kind, team_id, status, version, planning_json, expires_at, last_activity_at
    ) values (
      ${snapshot.id},
      ${snapshot.code},
      ${snapshot.name},
      ${snapshot.kind},
      ${snapshot.teamId},
      ${snapshot.status},
      ${version},
      ${planningText}::jsonb,
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
      planning_json = excluded.planning_json,
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
  const rows = await selectHistory(tx, filter);
  return rows.map((row) => mapHistory(row));
}

async function selectHistory(tx: Sql, filter: HistoryQuery): Promise<HistoryRow[]> {
  if (filter.teamId !== undefined && filter.itemId !== undefined) {
    return tx<HistoryRow[]>`
      select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
      from aggregated_history where team_id = ${filter.teamId} and item_id = ${filter.itemId}
    `;
  }
  if (filter.teamId !== undefined) {
    return tx<HistoryRow[]>`
      select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
      from aggregated_history where team_id = ${filter.teamId}
    `;
  }
  if (filter.roomId !== undefined && filter.itemId !== undefined) {
    return tx<HistoryRow[]>`
      select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
      from aggregated_history where room_id = ${filter.roomId} and item_id = ${filter.itemId}
    `;
  }
  if (filter.roomId !== undefined) {
    return tx<HistoryRow[]>`
      select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
      from aggregated_history where room_id = ${filter.roomId}
    `;
  }
  if (filter.itemId !== undefined) {
    return tx<HistoryRow[]>`
      select id, room_id, item_id, round_id, dominant_suit, vote_count, consensus, team_id, detail_json
      from aggregated_history where item_id = ${filter.itemId}
    `;
  }
  return [];
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
  const organizationId = team.organizationId ?? "org-mvp";
  await tx`
    insert into teams (id, name, organization_id) values (${team.id}, ${team.name}, ${organizationId})
    on conflict (id) do update set name = excluded.name, organization_id = excluded.organization_id
  `;
}

async function saveSprint(tx: Sql, sprint: PersistedSprintRecord): Promise<void> {
  await tx`
    insert into sprints (id, team_id, name, state_json) values (${sprint.id}, ${sprint.teamId}, ${sprint.name}, ${sprint.state === undefined ? null : JSON.stringify(sprint.state)}::jsonb)
    on conflict (id) do update set team_id = excluded.team_id, name = excluded.name, state_json = excluded.state_json
  `;
  const forecast = sprint.state?.forecastRecord;
  if (forecast) {
    await tx`
      insert into forecast_records (id, sprint_id, predicted_points, actual_points, created_at)
      values (${sprint.id}, ${sprint.id}, ${forecast.predicted}, ${forecast.delivered}, now())
      on conflict (id) do update set
        predicted_points = excluded.predicted_points,
        actual_points = excluded.actual_points
    `;
  }
}

async function saveUser(tx: Sql, user: PersistedUserRecord): Promise<void> {
  await tx`
    insert into users (id, email, display_name, status, is_super_admin, locale, theme)
    values (
      ${user.id},
      ${user.email},
      ${user.displayName},
      ${user.status ?? "active"},
      ${user.isSuperAdmin === true},
      ${user.locale ?? "pt-BR"},
      ${user.theme ?? "system"}
    )
    on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      status = excluded.status,
      is_super_admin = excluded.is_super_admin,
      locale = excluded.locale,
      theme = excluded.theme
  `;
}

async function saveInvite(tx: Sql, invite: PersistedInviteRecord): Promise<void> {
  await tx`
    insert into invites (id, team_id, role, token_hash, expires_at, revoked_at, accepted_by)
    values (
      ${invite.id},
      ${invite.teamId},
      ${invite.role},
      ${invite.tokenHash},
      ${invite.expiresAt},
      ${invite.revokedAt},
      ${invite.acceptedBy}
    )
    on conflict (id) do update set
      team_id = excluded.team_id,
      role = excluded.role,
      token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      revoked_at = excluded.revoked_at,
      accepted_by = excluded.accepted_by
  `;
}
