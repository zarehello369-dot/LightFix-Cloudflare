CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  request_key TEXT NOT NULL,
  request_payload TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  kind TEXT NOT NULL DEFAULT 'text' CHECK(kind IN ('text','offer')),
  pole TEXT,
  report_ids TEXT,
  work_revision INTEGER,
  offer_status TEXT CHECK(offer_status IN ('pending','accepted','declined','expired')),
  responded_at INTEGER,
  job_id TEXT,
  UNIQUE(sender_id,request_key),
  CHECK(sender_id<>recipient_id)
);
CREATE INDEX chat_incoming ON chat_messages(recipient_id,id DESC);
CREATE INDEX chat_outgoing ON chat_messages(sender_id,id DESC);
CREATE TABLE chat_offer_checks (
  operation_id TEXT PRIMARY KEY,
  valid INTEGER NOT NULL CONSTRAINT chat_offer_pending CHECK(valid=1)
);
