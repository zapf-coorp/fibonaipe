-- R1 schema. The server role owns these tables and bypasses row level security.
-- No policies are created for the anon or authenticated roles, so the public key cannot read them.
-- A free-tier scheduler should call the purge route with the x-cron-secret header; that route lives in the API package.

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists rooms (
  id text primary key,
  code text not null unique,
  name text not null,
  kind text not null,
  team_id text,
  status text not null,
  version integer not null,
  expires_at timestamptz,
  last_activity_at timestamptz not null
);

create table if not exists participants (
  id text primary key,
  room_id text not null,
  guest_token_hash varchar(64) not null check (guest_token_hash ~ '^[0-9a-f]{64}$'),
  joined_at timestamptz not null default now()
);

create table if not exists items (
  room_id text not null,
  id text not null,
  title text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (room_id, id)
);

create table if not exists rounds (
  id text primary key,
  room_id text not null,
  opened_at timestamptz not null default now()
);

create table if not exists votes (
  id text primary key,
  round_id text not null,
  participant_id text not null,
  cast_at timestamptz not null default now()
);

create table if not exists estimate_audits (
  id text primary key,
  room_id text not null,
  item_id text not null,
  changed_by text not null,
  at timestamptz not null,
  from_value text,
  to_value text not null
);

create table if not exists idempotency_keys (
  actor_id text not null,
  client_op_id text not null,
  processed_at timestamptz not null,
  primary key (actor_id, client_op_id)
);

create table if not exists aggregated_history (
  id text primary key,
  room_id text not null,
  item_id text not null,
  round_id text not null,
  dominant_suit text not null,
  vote_count integer not null,
  consensus boolean not null
);

create table if not exists teams (
  id text primary key,
  name text not null
);

create table if not exists sprints (
  id text primary key,
  team_id text not null,
  name text not null
);

create table if not exists users (
  id text primary key,
  email text not null,
  display_name text not null
);

alter table schema_migrations enable row level security;
alter table rooms enable row level security;
alter table participants enable row level security;
alter table items enable row level security;
alter table rounds enable row level security;
alter table votes enable row level security;
alter table estimate_audits enable row level security;
alter table idempotency_keys enable row level security;
alter table aggregated_history enable row level security;
alter table teams enable row level security;
alter table sprints enable row level security;
alter table users enable row level security;
