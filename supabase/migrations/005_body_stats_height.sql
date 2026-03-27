-- Migration 005 : taille (height) dans body_stats
alter table body_stats
  add column if not exists height_cm numeric(5, 1) check (height_cm > 0);
