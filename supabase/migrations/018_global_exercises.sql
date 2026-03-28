-- ============================================================
-- Migration 018 : Base d'exercices globale + suppression full_body
-- ============================================================

-- ── 1. Table exercices globaux (partagés entre tous les users) ──

create table global_exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  muscle_group  text check (muscle_group in (
                  'chest', 'back', 'shoulders', 'arms',
                  'legs', 'glutes', 'core', 'cardio', 'other'
                )),
  category      text not null default 'strength' check (category in (
                  'strength', 'cardio', 'flexibility', 'mobility'
                )),
  tracking_mode text not null default 'reps' check (tracking_mode in (
                  'reps', 'duration', 'reps_duration'
                )),
  notes         text,
  created_at    timestamptz not null default now()
);

create index idx_global_exercises_muscle on global_exercises(muscle_group);

-- Lecture publique (tous les utilisateurs authentifiés)
alter table global_exercises enable row level security;
create policy "global_exercises: read all" on global_exercises
  for select using (auth.uid() is not null);

-- ── 2. Seed : exercices prédéfinis ──────────────────────────────

insert into global_exercises (name, muscle_group, category, tracking_mode) values
  -- Pectoraux
  ('Développé couché',         'chest',     'strength',   'reps'),
  ('Développé incliné',        'chest',     'strength',   'reps'),
  ('Développé décliné',        'chest',     'strength',   'reps'),
  ('Écarté poulie',            'chest',     'strength',   'reps'),
  ('Écarté haltères',          'chest',     'strength',   'reps'),
  ('Pompes',                   'chest',     'strength',   'reps'),
  ('Dips',                     'chest',     'strength',   'reps'),
  ('Pec deck',                 'chest',     'strength',   'reps'),
  -- Dos
  ('Tractions',                'back',      'strength',   'reps'),
  ('Tractions assistées',      'back',      'strength',   'reps'),
  ('Rowing barre',             'back',      'strength',   'reps'),
  ('Rowing haltère',           'back',      'strength',   'reps'),
  ('Tirage vertical',          'back',      'strength',   'reps'),
  ('Tirage horizontal',        'back',      'strength',   'reps'),
  ('Soulevé de terre',         'back',      'strength',   'reps'),
  ('Soulevé de terre roumain', 'back',      'strength',   'reps'),
  ('Pull-over',                'back',      'strength',   'reps'),
  -- Épaules
  ('Développé militaire',      'shoulders', 'strength',   'reps'),
  ('Développé Arnold',         'shoulders', 'strength',   'reps'),
  ('Élévations latérales',     'shoulders', 'strength',   'reps'),
  ('Élévations frontales',     'shoulders', 'strength',   'reps'),
  ('Oiseau',                   'shoulders', 'strength',   'reps'),
  ('Face pull',                'shoulders', 'strength',   'reps'),
  -- Bras
  ('Curl biceps',              'arms',      'strength',   'reps'),
  ('Curl marteau',             'arms',      'strength',   'reps'),
  ('Curl incliné',             'arms',      'strength',   'reps'),
  ('Barre Z curl',             'arms',      'strength',   'reps'),
  ('Extension triceps poulie', 'arms',      'strength',   'reps'),
  ('Barre au front',           'arms',      'strength',   'reps'),
  ('Dips banc',                'arms',      'strength',   'reps'),
  ('Kickback triceps',         'arms',      'strength',   'reps'),
  -- Jambes
  ('Squat',                    'legs',      'strength',   'reps'),
  ('Squat avant',              'legs',      'strength',   'reps'),
  ('Presse à cuisses',         'legs',      'strength',   'reps'),
  ('Fentes avant',             'legs',      'strength',   'reps'),
  ('Fentes latérales',         'legs',      'strength',   'reps'),
  ('Leg curl',                 'legs',      'strength',   'reps'),
  ('Leg extension',            'legs',      'strength',   'reps'),
  ('Mollets debout',           'legs',      'strength',   'reps'),
  ('Mollets assis',            'legs',      'strength',   'reps'),
  -- Fessiers
  ('Hip thrust',               'glutes',    'strength',   'reps'),
  ('Abducteur machine',        'glutes',    'strength',   'reps'),
  ('Adducteur machine',        'glutes',    'strength',   'reps'),
  ('Kickback câble',           'glutes',    'strength',   'reps'),
  -- Abdos / Core
  ('Crunch',                   'core',      'strength',   'reps'),
  ('Crunch câble',             'core',      'strength',   'reps'),
  ('Relevé de jambes',         'core',      'strength',   'reps'),
  ('Russian twist',            'core',      'strength',   'reps'),
  ('Gainage',                  'core',      'strength',   'duration'),
  ('Gainage latéral',          'core',      'strength',   'duration'),
  ('Roue abdominale',          'core',      'strength',   'reps'),
  -- Cardio
  ('Course à pied',            'cardio',    'cardio',     'duration'),
  ('Vélo',                     'cardio',    'cardio',     'duration'),
  ('Rameur',                   'cardio',    'cardio',     'duration'),
  ('Elliptique',               'cardio',    'cardio',     'duration'),
  ('Corde à sauter',           'cardio',    'cardio',     'duration'),
  ('Stepping',                 'cardio',    'cardio',     'duration'),
  ('Burpees',                  'cardio',    'cardio',     'reps'),
  -- Échauffements / Mobilité
  ('Rotations épaules',        'other',     'flexibility','duration'),
  ('Étirements quadriceps',    'other',     'flexibility','duration'),
  ('Étirements ischio',        'other',     'flexibility','duration'),
  ('Étirements pectoraux',     'other',     'flexibility','duration'),
  ('Mobilité hanches',         'other',     'mobility',   'duration'),
  ('Mobilité thoracique',      'other',     'mobility',   'duration'),
  ('Mobilité chevilles',       'other',     'mobility',   'duration');

-- ── 3. Suppression catégorie full_body ──────────────────────────

-- Reclasser les exercices full_body existants en "other"
update exercises
set muscle_group = 'other'
where muscle_group = 'full_body';

-- Supprimer l'ancienne contrainte
alter table exercises
  drop constraint if exists exercises_muscle_group_check;

-- Nouvelle contrainte sans full_body
alter table exercises
  add constraint exercises_muscle_group_check
  check (muscle_group in (
    'chest', 'back', 'shoulders', 'arms',
    'legs', 'glutes', 'core', 'cardio', 'other'
  ));
