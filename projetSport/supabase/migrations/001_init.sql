-- ============================================================
-- Migration 001 : Initialisation du schéma projetSport
-- ============================================================

-- Extension UUID (activée par défaut sur Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- TEMPLATES : modèles de séances réutilisables
-- ============================================================
create table templates (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TEMPLATE_EXERCISES : exercices associés à un template
-- ============================================================
create table template_exercises (
  id              uuid primary key default uuid_generate_v4(),
  template_id     uuid not null references templates(id) on delete cascade,
  exercise_name   text not null,
  order_index     smallint not null default 0,
  default_sets    smallint,
  default_reps    smallint,
  default_weight  numeric(6, 2),      -- en kg, ex: 102.50
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SESSIONS : séances réellement effectuées
-- ============================================================
create table sessions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SESSION_SETS : séries enregistrées pendant une séance
-- ============================================================
create table session_sets (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid not null references sessions(id) on delete cascade,
  exercise_name  text not null,
  set_number     smallint not null,
  reps           smallint,
  weight_kg      numeric(6, 2),
  completed_at   timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS : mise à jour automatique de updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger templates_updated_at
  before update on templates
  for each row execute function update_updated_at();

-- ============================================================
-- INDEX : performances sur les requêtes courantes
-- ============================================================
create index idx_templates_user_id          on templates(user_id);
create index idx_template_exercises_tmpl    on template_exercises(template_id);
create index idx_sessions_user_id           on sessions(user_id);
create index idx_sessions_template_id       on sessions(template_id);
create index idx_session_sets_session_id    on session_sets(session_id);

-- ============================================================
-- ROW LEVEL SECURITY : chaque utilisateur ne voit que ses données
-- ============================================================
alter table templates         enable row level security;
alter table template_exercises enable row level security;
alter table sessions           enable row level security;
alter table session_sets       enable row level security;

-- Policies templates
create policy "templates: own rows" on templates
  for all using (auth.uid() = user_id);

-- Policies template_exercises (accès via le template parent)
create policy "template_exercises: own rows" on template_exercises
  for all using (
    exists (
      select 1 from templates
      where templates.id = template_exercises.template_id
        and templates.user_id = auth.uid()
    )
  );

-- Policies sessions
create policy "sessions: own rows" on sessions
  for all using (auth.uid() = user_id);

-- Policies session_sets (accès via la session parente)
create policy "session_sets: own rows" on session_sets
  for all using (
    exists (
      select 1 from sessions
      where sessions.id = session_sets.session_id
        and sessions.user_id = auth.uid()
    )
  );
