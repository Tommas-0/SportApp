-- Migration 014 : métriques cardio (vitesse, inclinaison, résistance)
alter table workout_sets
  add column if not exists speed_kmh        numeric(5,2) check (speed_kmh >= 0),
  add column if not exists incline_pct      numeric(4,1) check (incline_pct >= 0 and incline_pct <= 15),
  add column if not exists resistance_level smallint     check (resistance_level >= 0 and resistance_level <= 30);
