CREATE TABLE IF NOT EXISTS partners (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE IF NOT EXISTS partner_usage (
  day TEXT NOT NULL,
  partner_code TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('web','extension')),
  event_type TEXT NOT NULL CHECK (event_type IN ('started','completed')),
  event_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  duration_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day, partner_code, source, event_type),
  FOREIGN KEY(partner_code) REFERENCES partners(code)
);

ALTER TABLE events ADD COLUMN partner_code TEXT;
ALTER TABLE feedback ADD COLUMN partner_code TEXT;

CREATE INDEX IF NOT EXISTS idx_partner_usage_code ON partner_usage(partner_code);
CREATE INDEX IF NOT EXISTS idx_events_partner_code ON events(partner_code);
CREATE INDEX IF NOT EXISTS idx_feedback_partner_code ON feedback(partner_code);
