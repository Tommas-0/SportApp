-- ============================================================
-- Migration 002 : Schéma v2 — remplacement du schéma initial
-- Exécuter après avoir supprimé les tables de la migration 001
-- ============================================================

-- Suppression des anciennes tables (ordre important : FK d'abord)
drop table if exists session_sets cascade;
drop table if exists sessions cascade;
drop table if exists template_exercises cascade;
drop table if exists templates cascade;

-- ============================================================
-- EXERCISES : bibliothèque d'exercices de l'utilisateur
-- ============================================================
create table exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  muscle_group text check (muscle_group in (
                  'chest', 'back', 'shoulders', 'arms',
                  'legs', 'glutes', 'core', 'cardio', 'full_body', 'other'
                )),
  category     text not null default 'strength' check (category in (
                  'strength', 'cardio', 'flexibility', 'mobility'
                )),
  notes        text,
  created_at   timestamptz not null default now(),

  unique (user_id, name)
);

-- ============================================================
-- WORKOUT_TEMPLATES : modèles de séances réutilisables
-- ============================================================
create table workout_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TEMPLATE_EXERCISES : exercices planifiés dans un template
-- ============================================================
create table template_exercises (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references workout_templates(id) on delete cascade,
  exercise_id     uuid not null references exercises(id) on delete restrict,
  order_index     smallint not null default 0,
  default_sets    smallint check (default_sets > 0),
  default_reps    smallint check (default_reps > 0),
  default_weight  numeric(6, 2) check (default_weight >= 0),
  rest_seconds    smallint check (rest_seconds >= 0),
  notes           text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- WORKOUT_SESSIONS : séances réellement effectuées
-- ============================================================
create table workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  template_id uuid references workout_templates(id) on delete set null,
  name        text not null,             -- copié depuis le template ou libre
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- WORKOUT_SETS : séries enregistrées pendant une séance
-- ============================================================
create table workout_sets (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references workout_sessions(id) on delete cascade,
  exercise_id  uuid not null references exercises(id) on delete restrict,
  set_number   smallint not null check (set_number > 0),
  reps         smallint check (reps >= 0),
  weight_kg    numeric(6, 2) check (weight_kg >= 0),
  rpe          smallint check (rpe between 1 and 10),   -- effort perçu
  is_warmup    boolean not null default false,
  completed_at timestamptz not null default now()
);

-- ============================================================
-- BODY_STATS : suivi corporel dans le temps
-- ============================================================
create table body_stats (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  recorded_at    timestamptz not null default now(),
  weight_kg      numeric(5, 2) check (weight_kg > 0),
  body_fat_pct   numeric(4, 1) check (body_fat_pct between 0 and 100),
  muscle_mass_kg numeric(5, 2) check (muscle_mass_kg > 0),
  chest_cm       numeric(5, 1) check (chest_cm > 0),
  waist_cm       numeric(5, 1) check (waist_cm > 0),
  hips_cm        numeric(5, 1) check (hips_cm > 0),
  notes          text,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- TRIGGER : updated_at automatique sur workout_templates
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workout_templates_updated_at
  before update on workout_templates
  for each row execute function update_updated_at();

-- ============================================================
-- INDEX
-- ============================================================
create index idx_exercises_user_id             on exercises(user_id);
create index idx_workout_templates_user_id     on workout_templates(user_id);
create index idx_template_exercises_template   on template_exercises(template_id);
create index idx_template_exercises_exercise   on template_exercises(exercise_id);
create index idx_workout_sessions_user_id      on workout_sessions(user_id);
create index idx_workout_sessions_template_id  on workout_sessions(template_id);
create index idx_workout_sessions_started_at   on workout_sessions(user_id, started_at desc);
create index idx_workout_sets_session_id       on workout_sets(session_id);
create index idx_workout_sets_exercise_id      on workout_sets(exercise_id);
create index idx_body_stats_user_recorded      on body_stats(user_id, recorded_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table exercises          enable row level security;
alter table workout_templates  enable row level security;
alter table template_exercises enable row level security;
alter table workout_sessions   enable row level security;
alter table workout_sets       enable row level security;
alter table body_stats         enable row level security;

-- exercises
create policy "exercises: own rows" on exercises
  for all using (auth.uid() = user_id);

-- workout_templates
create policy "workout_templates: own rows" on workout_templates
  for all using (auth.uid() = user_id);

-- template_exercises (accès via template parent)
create policy "template_exercises: own rows" on template_exercises
  for all using (
    exists (
      select 1 from workout_templates
      where workout_templates.id = template_exercises.template_id
        and workout_templates.user_id = auth.uid()
    )
  );

-- workout_sessions
create policy "workout_sessions: own rows" on workout_sessions
  for all using (auth.uid() = user_id);

-- workout_sets (accès via session parente)
create policy "workout_sets: own rows" on workout_sets
  for all using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );

-- body_stats
create policy "body_stats: own rows" on body_stats
  for all using (auth.uid() = user_id);
