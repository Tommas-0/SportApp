-- ============================================================
-- Migration 017 : Système de segments (dropset)
-- 1 workout_set → plusieurs set_segments
-- ============================================================

create table set_segments (
  id          uuid primary key default gen_random_uuid(),
  set_id      uuid not null references workout_sets(id) on delete cascade,
  weight_kg   numeric(6, 2) check (weight_kg >= 0),
  reps        smallint check (reps >= 0),
  order_index smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_set_segments_set_id on set_segments(set_id);

alter table set_segments enable row level security;

-- Accès via workout_sets → workout_sessions → user_id
create policy "set_segments: own rows" on set_segments
  for all using (
    exists (
      select 1
      from workout_sets ws
      join workout_sessions s on s.id = ws.session_id
      where ws.id = set_segments.set_id
        and s.user_id = auth.uid()
    )
  );
