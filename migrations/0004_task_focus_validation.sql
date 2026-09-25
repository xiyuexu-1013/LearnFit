ALTER TABLE feedback ADD COLUMN verified_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE feedback ADD COLUMN off_task_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE feedback ADD COLUMN tracking_coverage REAL NOT NULL DEFAULT 0;
ALTER TABLE feedback ADD COLUMN self_reported_focus INTEGER CHECK (self_reported_focus BETWEEN 1 AND 5);
ALTER TABLE feedback ADD COLUMN on_task_share TEXT CHECK (on_task_share IN ('all','most','half','little','none'));
