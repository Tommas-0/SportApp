-- ============================================================
-- Migration 015 : Suivi journalier du sommeil
-- ============================================================

CREATE TABLE daily_sleep (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  hours      NUMERIC(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  quality    SMALLINT    CHECK (quality BETWEEN 1 AND 5),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_sleep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_sleep: own rows" ON daily_sleep
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_daily_sleep_user_date ON daily_sleep(user_id, date DESC);
