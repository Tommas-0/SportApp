-- Migration 004 : masse osseuse + % hydratation
alter table body_stats
  add column if not exists bone_mass_kg  numeric(4, 2) check (bone_mass_kg > 0),
  add column if not exists hydration_pct numeric(4, 1) check (hydration_pct between 0 and 100);
