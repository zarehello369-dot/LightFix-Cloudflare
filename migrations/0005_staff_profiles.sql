CREATE TABLE staff_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar BLOB,
  avatar_type TEXT,
  version TEXT NOT NULL
);
CREATE TABLE staff_presence (
  session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  tab_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY(session_hash,tab_id)
);
CREATE INDEX staff_presence_user ON staff_presence(user_id,last_seen);
