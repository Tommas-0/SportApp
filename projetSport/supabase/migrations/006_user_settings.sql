-- Migration 006 : paramètres utilisateur (objectif fitness)
create table if not exists user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  fitness_goal text check (fitness_goal in ('bulk', 'cut', 'maintain', 'recomp')),
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "user_settings_select" on user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert" on user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update" on user_settings for update using (auth.uid() = user_id);
