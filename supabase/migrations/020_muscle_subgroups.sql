-- ============================================================
-- Migration 020 : Groupes et sous-groupes musculaires
-- ============================================================

-- ── 1. Tables de référence ───────────────────────────────────

create table muscle_groups (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique,   -- ex: 'arms'    (clé technique)
  name text not null unique    -- ex: 'Bras'    (affiché)
);

create table muscle_subgroups (
  id       uuid primary key default gen_random_uuid(),
  slug     text not null unique,   -- ex: 'biceps'
  name     text not null unique,   -- ex: 'Biceps'
  group_id uuid not null references muscle_groups(id) on delete cascade
);

create index idx_muscle_subgroups_group on muscle_subgroups(group_id);

-- ── 2. Seed groupes ──────────────────────────────────────────

insert into muscle_groups (slug, name) values
  ('chest',     'Pectoraux'),
  ('back',      'Dos'),
  ('shoulders', 'Épaules'),
  ('arms',      'Bras'),
  ('legs',      'Jambes'),
  ('glutes',    'Fessiers'),
  ('core',      'Abdos / Core'),
  ('cardio',    'Cardio'),
  ('other',     'Autre');

-- ── 3. Seed sous-groupes ─────────────────────────────────────

insert into muscle_subgroups (slug, name, group_id) values
  -- Pectoraux
  ('chest_upper',  'Pectoraux supérieurs',  (select id from muscle_groups where slug='chest')),
  ('chest_lower',  'Pectoraux inférieurs',  (select id from muscle_groups where slug='chest')),
  ('chest_iso',    'Isolation pectoraux',   (select id from muscle_groups where slug='chest')),

  -- Dos
  ('lats',         'Dorsaux',               (select id from muscle_groups where slug='back')),
  ('traps',        'Trapèzes',              (select id from muscle_groups where slug='back')),
  ('lower_back',   'Lombaires',             (select id from muscle_groups where slug='back')),

  -- Épaules
  ('front_delt',   'Épaules antérieures',   (select id from muscle_groups where slug='shoulders')),
  ('side_delt',    'Épaules latérales',     (select id from muscle_groups where slug='shoulders')),
  ('rear_delt',    'Épaules postérieures',  (select id from muscle_groups where slug='shoulders')),

  -- Bras
  ('biceps',       'Biceps',                (select id from muscle_groups where slug='arms')),
  ('triceps',      'Triceps',               (select id from muscle_groups where slug='arms')),
  ('forearms',     'Avant-bras',            (select id from muscle_groups where slug='arms')),

  -- Jambes
  ('quads',        'Quadriceps',            (select id from muscle_groups where slug='legs')),
  ('hamstrings',   'Ischio-jambiers',       (select id from muscle_groups where slug='legs')),
  ('calves',       'Mollets',               (select id from muscle_groups where slug='legs')),

  -- Fessiers
  ('glutes_main',  'Grand fessier',         (select id from muscle_groups where slug='glutes')),
  ('glutes_med',   'Moyen fessier',         (select id from muscle_groups where slug='glutes')),

  -- Abdos / Core
  ('abs',          'Abdominaux',            (select id from muscle_groups where slug='core')),
  ('core_stab',    'Gainage / Stabilité',   (select id from muscle_groups where slug='core')),

  -- Cardio
  ('cardio_gen',   'Cardio général',        (select id from muscle_groups where slug='cardio')),

  -- Autre
  ('mobility',     'Mobilité / Souplesse',  (select id from muscle_groups where slug='other'));

-- ── 4. Ajout du champ subgroup_id sur les exercices ──────────

-- Nullable : les exercices existants ne sont pas cassés
alter table exercises       add column subgroup_id uuid references muscle_subgroups(id) on delete set null;
alter table global_exercises add column subgroup_id uuid references muscle_subgroups(id) on delete set null;

create index idx_exercises_subgroup       on exercises(subgroup_id);
create index idx_global_exercises_subgroup on global_exercises(subgroup_id);

-- ── 5. Rattacher les exercices globaux à leurs sous-groupes ──

-- Helper pour récupérer un subgroup_id par slug
-- (on évite les sous-requêtes répétées avec une CTE)

with sg as (
  select id, slug from muscle_subgroups
)
update global_exercises ge
set subgroup_id = sg.id
from sg
where
  -- Pectoraux sup (développé couché / incliné / pompes)
  (sg.slug = 'chest_upper' and ge.name in (
    'Développé couché barre','Développé couché haltères',
    'Développé incliné barre','Développé incliné haltères',
    'Pompes','Dips'
  ))
  or
  -- Pectoraux inf (développé décliné)
  (sg.slug = 'chest_lower' and ge.name in (
    'Développé décliné'
  ))
  or
  -- Isolation pectoraux (écarté, pec fly)
  (sg.slug = 'chest_iso' and ge.name in (
    'Écarté poulie haute','Écarté poulie basse','Écarté haltères','Pec fly'
  ))
  or
  -- Dorsaux (tractions, tirage, rowing)
  (sg.slug = 'lats' and ge.name in (
    'Tractions','Tractions assistées',
    'Rowing barre pronation','Rowing barre supination','Rowing haltère',
    'Tirage vertical prise large','Tirage vertical prise serrée',
    'Tirage horizontal poulie','Pull-over poulie'
  ))
  or
  -- Lombaires (soulevé de terre)
  (sg.slug = 'lower_back' and ge.name in (
    'Soulevé de terre','Soulevé de terre roumain','Soulevé de terre jambes tendues'
  ))
  or
  -- Épaules ant (développé militaire / Arnold / frontales)
  (sg.slug = 'front_delt' and ge.name in (
    'Développé militaire','Développé Arnold',
    'Élévations frontales haltères','Élévations frontales poulie'
  ))
  or
  -- Épaules lat (élévations latérales)
  (sg.slug = 'side_delt' and ge.name in (
    'Élévations latérales haltères','Élévations latérales poulie'
  ))
  or
  -- Épaules post (oiseau, face pull, reverse pec fly)
  (sg.slug = 'rear_delt' and ge.name in (
    'Oiseau','Face pull','Reverse pec fly'
  ))
  or
  -- Biceps
  (sg.slug = 'biceps' and ge.name in (
    'Curl haltères','Curl barre','Curl marteau','Curl incliné',
    'Curl poulie','Curl concentration','Barre Z curl'
  ))
  or
  -- Triceps
  (sg.slug = 'triceps' and ge.name in (
    'Extension triceps corde','Extension triceps barre',
    'Barre au front','Dips banc','Kickback triceps'
  ))
  or
  -- Quadriceps
  (sg.slug = 'quads' and ge.name in (
    'Squat','Squat avant','Leg press','Hack squat',
    'Fentes avant','Fentes latérales','Bulgarian split squat','Leg extension'
  ))
  or
  -- Ischio-jambiers
  (sg.slug = 'hamstrings' and ge.name in (
    'Leg curl','Soulevé de terre jambes tendues'
  ))
  or
  -- Mollets
  (sg.slug = 'calves' and ge.name in (
    'Mollets debout','Mollets assis'
  ))
  or
  -- Grand fessier
  (sg.slug = 'glutes_main' and ge.name in (
    'Hip thrust','Kickback câble'
  ))
  or
  -- Moyen fessier
  (sg.slug = 'glutes_med' and ge.name in (
    'Abducteur machine','Adducteur machine'
  ))
  or
  -- Abdominaux
  (sg.slug = 'abs' and ge.name in (
    'Crunch','Crunch câble','Crunch machine',
    'Relevé de jambes','Russian twist','Roue abdominale'
  ))
  or
  -- Gainage
  (sg.slug = 'core_stab' and ge.name in (
    'Gainage','Gainage latéral','Gainage lesté'
  ))
  or
  -- Cardio
  (sg.slug = 'cardio_gen' and ge.muscle_group = 'cardio')
  or
  -- Mobilité
  (sg.slug = 'mobility' and ge.muscle_group = 'other');

-- ── 6. RLS sur les tables de référence (lecture publique) ────

alter table muscle_groups    enable row level security;
alter table muscle_subgroups enable row level security;

create policy "muscle_groups: read all"    on muscle_groups    for select using (auth.uid() is not null);
create policy "muscle_subgroups: read all" on muscle_subgroups for select using (auth.uid() is not null);
