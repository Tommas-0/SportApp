-- Migration 013 : segments cardio (pause / reprendre)
create table if not exists cardio_segments (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references workout_sets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  created_at  timestamptz default now()
);

alter table cardio_segments enable row level security;

create policy "cardio_segments_select" on cardio_segments for select using (auth.uid() = user_id);
create policy "cardio_segments_insert" on cardio_segments for insert with check (auth.uid() = user_id);
create policy "cardio_segments_delete" on cardio_segments for delete using (auth.uid() = user_id);

create index cardio_segments_set_id_idx on cardio_segments(set_id);
