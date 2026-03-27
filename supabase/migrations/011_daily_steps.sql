-- ============================================================
-- Migration 011 : Suivi journalier des pas
-- ============================================================

CREATE TABLE daily_steps (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  steps      INTEGER     NOT NULL CHECK (steps >= 0),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_steps: own rows" ON daily_steps
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_daily_steps_user_date ON daily_steps(user_id, date DESC);
