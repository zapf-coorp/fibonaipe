-- R2 identity. Teams keep the implicit MVP organization. Invite secrets are stored as hashes.

create table if not exists organizations (
  id text primary key,
  name text not null
);

insert into organizations (id, name) values ('org-mvp', 'Fibonaipe')
on conflict (id) do nothing;

alter table users add column if not exists status text not null default 'active';
alter table users add column if not exists is_super_admin boolean not null default false;
alter table users add column if not exists locale text not null default 'pt-BR';
alter table users add column if not exists theme text not null default 'system';

alter table teams add column if not exists organization_id text not null default 'org-mvp';

create table if not exists memberships (
  user_id text not null,
  team_id text not null,
  role text not null,
  primary key (user_id, team_id)
);

create table if not exists invites (
  id text primary key,
  team_id text not null,
  role text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_by text
);

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table invites enable row level security;
