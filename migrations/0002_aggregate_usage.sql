CREATE TABLE IF NOT EXISTS daily_usage (
  day TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('web','extension')),
  event_type TEXT NOT NULL CHECK (event_type IN ('started','completed')),
  event_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day, source, event_type)
);
