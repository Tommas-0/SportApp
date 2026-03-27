-- ============================================================
-- Migration 016 : Suivi journalier des calories ingérées
-- ============================================================

CREATE TABLE daily_calories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  kcal_ingested INTEGER     NOT NULL CHECK (kcal_ingested >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_calories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_calories: own rows" ON daily_calories
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_daily_calories_user_date ON daily_calories(user_id, date DESC);
