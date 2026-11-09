-- R1 already creates sprints. Dates remain nullable for legacy records until
-- they are explicitly configured by the sprint workflow.
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned';
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS committed_points numeric;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS delivered_points numeric;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS frozen_metrics jsonb;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS state_json jsonb;
CREATE INDEX IF NOT EXISTS sprints_team_dates_idx ON sprints(team_id, start_date, end_date);
CREATE TABLE IF NOT EXISTS capacity_entries (
  sprint_id text NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  person_id text NOT NULL,
  absence_days numeric NOT NULL DEFAULT 0 CHECK (absence_days >= 0),
  focus_pct numeric NOT NULL DEFAULT 100 CHECK (focus_pct BETWEEN 0 AND 100),
  PRIMARY KEY (sprint_id, person_id)
);
CREATE TABLE IF NOT EXISTS holidays (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  UNIQUE (team_id, date)
);
CREATE TABLE IF NOT EXISTS sprint_items (
  sprint_id text NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  estimate numeric,
  done_at timestamptz,
  added_after_start boolean NOT NULL DEFAULT false,
  carried_over boolean NOT NULL DEFAULT false,
  estimate_exceeded boolean,
  PRIMARY KEY (sprint_id, item_id)
);
CREATE INDEX IF NOT EXISTS sprint_items_item_idx ON sprint_items(item_id);
CREATE TABLE IF NOT EXISTS forecast_records (
  id text PRIMARY KEY,
  sprint_id text NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  predicted_points numeric,
  actual_points numeric,
  created_at timestamptz
);

-- The server role owns these tables. Public client roles get no direct policy.
ALTER TABLE capacity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_records ENABLE ROW LEVEL SECURITY;
