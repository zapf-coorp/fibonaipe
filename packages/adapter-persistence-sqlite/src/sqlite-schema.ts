import { DatabaseSync } from "node:sqlite";
import { isRecord } from "./sqlite-mappers.js";

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  team_id TEXT,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  items_json TEXT NOT NULL,
  planning_json TEXT,
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
  name TEXT NOT NULL,
  state_json TEXT
);
CREATE TABLE IF NOT EXISTS holidays (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, date TEXT NOT NULL, name TEXT NOT NULL, UNIQUE(team_id, date));
CREATE TABLE IF NOT EXISTS team_tasks (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sprint_name TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  task_number INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL
);
`;

export function ensureSprintStateColumn(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(sprints)").all();
  if (!columns.some((column) => isRecord(column) && column.name === "state_json")) db.exec("ALTER TABLE sprints ADD COLUMN state_json TEXT");
}

export function ensureIdentitySchema(db: DatabaseSync): void {
  ensureColumn(db, "users", "status", "TEXT NOT NULL DEFAULT 'active'");
  ensureColumn(db, "users", "is_super_admin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "users", "locale", "TEXT NOT NULL DEFAULT 'pt-BR'");
  ensureColumn(db, "users", "theme", "TEXT NOT NULL DEFAULT 'system'");
  ensureColumn(db, "teams", "organization_id", "TEXT NOT NULL DEFAULT 'org-mvp'");
  db.exec(`
    CREATE TABLE IF NOT EXISTS memberships (
      user_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (user_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      role TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      accepted_by TEXT
    );
  `);
}

export function ensureHistorySchema(db: DatabaseSync): void {
  ensureColumn(db, "history_entries", "team_id", "TEXT");
  ensureColumn(db, "history_entries", "detail_json", "TEXT");
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const present = columns.some((entry) => isRecord(entry) && entry.name === column);
  if (!present) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function ensureTeamTaskLink(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(team_tasks)").all();
  const present = columns.some((column) => isRecord(column) && column.name === "link");
  if (!present) db.exec("ALTER TABLE team_tasks ADD COLUMN link TEXT NOT NULL DEFAULT ''");
}

export function ensurePlanningColumn(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(rooms)").all();
  const present = columns.some((column) => isRecord(column) && column.name === "planning_json");
  if (!present) db.exec("ALTER TABLE rooms ADD COLUMN planning_json TEXT");
}
