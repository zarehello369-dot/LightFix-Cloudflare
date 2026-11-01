PRAGMA foreign_keys = ON;

CREATE TABLE poles (
  pole TEXT PRIMARY KEY,
  location TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  model TEXT NOT NULL DEFAULT '',
  installed_at TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician')),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE login_attempts (
  username TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  resets_at INTEGER NOT NULL
);
CREATE INDEX rate_limits_reset ON rate_limits(resets_at);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  pole TEXT NOT NULL REFERENCES poles(pole),
  symptom TEXT NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('name', 'phone', 'email', 'line')),
  contact_value TEXT NOT NULL,
  before_photo_key TEXT,
  status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2, 3)),
  created_at INTEGER NOT NULL,
  job_id TEXT,
  request_id TEXT NOT NULL UNIQUE,
  public_note TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT REFERENCES users(id),
  instructions TEXT NOT NULL DEFAULT '',
  due_at INTEGER
);
CREATE INDEX reports_pole_status ON reports(pole, status);
CREATE INDEX reports_created ON reports(created_at DESC);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  pole TEXT NOT NULL REFERENCES poles(pole),
  status INTEGER NOT NULL CHECK (status IN (1, 2, 3)),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  after_photo_key TEXT,
  public_note TEXT NOT NULL DEFAULT '',
  cause TEXT NOT NULL DEFAULT '',
  cause_detail TEXT NOT NULL DEFAULT '',
  technician_id TEXT REFERENCES users(id),
  assigned_user_id TEXT REFERENCES users(id),
  instructions TEXT NOT NULL DEFAULT '',
  due_at INTEGER
);
CREATE INDEX jobs_pole_status ON jobs(pole, status);

CREATE TABLE audit (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL
);
CREATE INDEX audit_at ON audit(at DESC);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  report_ids TEXT NOT NULL DEFAULT '[]',
  read_at INTEGER
);
CREATE INDEX notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE registrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  requested_role TEXT NOT NULL CHECK (requested_role IN ('admin', 'technician')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT,
  reason TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT ''
);
CREATE INDEX registrations_status ON registrations(status, requested_at DESC);
