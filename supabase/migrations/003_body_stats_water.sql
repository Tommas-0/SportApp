-- Migration 003 : ajout de la colonne water_ml dans body_stats
alter table body_stats
  add column if not exists water_ml integer check (water_ml >= 0);
