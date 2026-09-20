CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  anon_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('web','extension')),
  event_type TEXT NOT NULL CHECK (event_type IN ('started','completed')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  score REAL,
  app_version TEXT NOT NULL,
  UNIQUE(session_id, event_type)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  anon_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('web','extension')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  score REAL,
  app_version TEXT NOT NULL,
  ease INTEGER NOT NULL CHECK (ease BETWEEN 1 AND 5),
  usefulness INTEGER NOT NULL CHECK (usefulness BETWEEN 1 AND 5),
  trust INTEGER NOT NULL CHECK (trust BETWEEN 1 AND 5),
  would_use TEXT NOT NULL CHECK (would_use IN ('yes','maybe','no')),
  most_useful TEXT NOT NULL,
  confusing TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_anon_id ON events(anon_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
