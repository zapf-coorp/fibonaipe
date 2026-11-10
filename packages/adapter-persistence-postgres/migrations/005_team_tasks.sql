create table if not exists team_tasks (
  id text primary key,
  team_id text not null,
  title text not null,
  sprint_name text not null,
  task_number integer not null
);
