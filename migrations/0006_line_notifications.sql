CREATE TABLE line_groups (
  group_id TEXT PRIMARY KEY,
  last_seen_at INTEGER NOT NULL,
  selected INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0, 1))
);
CREATE UNIQUE INDEX line_one_selected_group ON line_groups(selected) WHERE selected=1;
