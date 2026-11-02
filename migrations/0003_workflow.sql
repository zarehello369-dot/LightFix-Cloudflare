CREATE TABLE pole_work_state (
  pole TEXT PRIMARY KEY REFERENCES poles(pole) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);
INSERT INTO pole_work_state(pole,revision,updated_at,updated_by) SELECT pole,0,updated_at,'' FROM poles;
CREATE TABLE work_mutation_checks (
  operation_id TEXT PRIMARY KEY,
  valid INTEGER NOT NULL CONSTRAINT work_revision_match CHECK(valid=1)
);
CREATE UNIQUE INDEX jobs_one_active_per_pole ON jobs(pole) WHERE status=1;
