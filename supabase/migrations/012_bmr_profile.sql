-- Migration 012 : profil BMR (âge, sexe, niveau d'activité) dans user_settings
alter table user_settings
  add column if not exists age            smallint check (age > 0 and age <= 120),
  add column if not exists gender         text check (gender in ('male', 'female')),
  add column if not exists activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active'));
