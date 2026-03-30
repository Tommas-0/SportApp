-- ============================================================
-- Migration 021 : Enrichissement de la base d'exercices globaux
-- ============================================================
-- Stratégie : ON CONFLICT (name) DO NOTHING pour éviter tout doublon
-- ============================================================

insert into global_exercises (name, muscle_group, category, tracking_mode) values

  -- ── Pectoraux ────────────────────────────────────────────────
  ('Développé couché prise serrée',    'chest',     'strength',   'reps'),
  ('Pompes archer',                    'chest',     'strength',   'reps'),
  ('Chest fly machine',                'chest',     'strength',   'reps'),
  ('Pompes déclinées',                 'chest',     'strength',   'reps'),
  ('Câble crossover',                  'chest',     'strength',   'reps'),

  -- ── Dos ─────────────────────────────────────────────────────
  ('T-bar row',                        'back',      'strength',   'reps'),
  ('Tirage nuque',                     'back',      'strength',   'reps'),
  ('Hyperextension',                   'back',      'strength',   'reps'),
  ('Good morning barre',               'back',      'strength',   'reps'),
  ('Tirage bras tendus poulie haute',  'back',      'strength',   'reps'),
  ('Rack pull',                        'back',      'strength',   'reps'),
  ('Tractions lestées',                'back',      'strength',   'reps'),
  ('Shrugs barre',                     'back',      'strength',   'reps'),
  ('Shrugs haltères',                  'back',      'strength',   'reps'),

  -- ── Épaules ─────────────────────────────────────────────────
  ('Développé haltères assis',         'shoulders', 'strength',   'reps'),
  ('Rowing menton barre',              'shoulders', 'strength',   'reps'),
  ('Cable lateral raise',              'shoulders', 'strength',   'reps'),
  ('L-fly rotation externe',           'shoulders', 'strength',   'reps'),
  ('Tirage à la nuque buste penché',   'shoulders', 'strength',   'reps'),

  -- ── Bras ────────────────────────────────────────────────────
  ('Curl araignée',                    'arms',      'strength',   'reps'),
  ('Curl pupitre',                     'arms',      'strength',   'reps'),
  ('Curl câble basse poulie',          'arms',      'strength',   'reps'),
  ('Curl barre EZ incliné',            'arms',      'strength',   'reps'),
  ('Extension triceps au-dessus tête', 'arms',      'strength',   'reps'),
  ('Extension triceps haltère',        'arms',      'strength',   'reps'),
  ('Dips barres parallèles',           'arms',      'strength',   'reps'),
  ('Pushdown corde',                   'arms',      'strength',   'reps'),
  ('Skullcrusher haltères',            'arms',      'strength',   'reps'),

  -- ── Jambes ──────────────────────────────────────────────────
  ('Sumo squat',                       'legs',      'strength',   'reps'),
  ('Goblet squat',                     'legs',      'strength',   'reps'),
  ('Step-ups',                         'legs',      'strength',   'reps'),
  ('Nordic curl',                      'legs',      'strength',   'reps'),
  ('Leg press unilatéral',             'legs',      'strength',   'reps'),
  ('Sissy squat',                      'legs',      'strength',   'reps'),
  ('Good morning haltères',            'legs',      'strength',   'reps'),
  ('Fentes arrière',                   'legs',      'strength',   'reps'),
  ('Fentes marchées',                  'legs',      'strength',   'reps'),
  ('Presse à cuisses unilatérale',     'legs',      'strength',   'reps'),

  -- ── Fessiers ────────────────────────────────────────────────
  ('Glute bridge barre',               'glutes',    'strength',   'reps'),
  ('Donkey kicks poulie',              'glutes',    'strength',   'reps'),
  ('Abduction debout poulie',          'glutes',    'strength',   'reps'),
  ('Hip thrust unilatéral',            'glutes',    'strength',   'reps'),
  ('Clamshell',                        'glutes',    'strength',   'reps'),

  -- ── Abdos / Core ────────────────────────────────────────────
  ('Crunch vélo',                      'core',      'strength',   'reps'),
  ('Dead bug',                         'core',      'strength',   'reps'),
  ('Mountain climbers',                'core',      'strength',   'reps'),
  ('Obliques câble',                   'core',      'strength',   'reps'),
  ('V-sit',                            'core',      'strength',   'reps'),
  ('Planche sur les mains',            'core',      'strength',   'duration'),
  ('Crunch inverse',                   'core',      'strength',   'reps'),
  ('Dragon flag',                      'core',      'strength',   'reps'),
  ('L-sit',                            'core',      'strength',   'duration'),
  ('Relevé de jambes suspendu',        'core',      'strength',   'reps'),

  -- ── Cardio ──────────────────────────────────────────────────
  ('Natation',                         'cardio',    'cardio',     'duration'),
  ('Marche rapide',                    'cardio',    'cardio',     'duration'),
  ('Tapis roulant incliné',            'cardio',    'cardio',     'duration'),
  ('Vélo stationnaire',                'cardio',    'cardio',     'duration'),
  ('Ski ergo',                         'cardio',    'cardio',     'duration'),
  ('Boxe / Shadow boxing',             'cardio',    'cardio',     'duration'),
  ('Interval training HIIT',           'cardio',    'cardio',     'duration'),
  ('Saut vertical',                    'cardio',    'cardio',     'reps'),
  ('Battle ropes',                     'cardio',    'cardio',     'duration'),
  ('Assault bike',                     'cardio',    'cardio',     'duration'),

  -- ── Autre / Mobilité ────────────────────────────────────────
  ('Foam rolling',                     'other',     'flexibility','duration'),
  ('Yoga',                             'other',     'flexibility','duration'),
  ('Échauffement général',             'other',     'flexibility','duration'),
  ('Mobilité épaules',                 'other',     'mobility',   'duration'),
  ('Étirements dos',                   'other',     'flexibility','duration'),
  ('Étirements mollets',               'other',     'flexibility','duration'),
  ('Mobilité poignets',                'other',     'mobility',   'duration')

on conflict (name) do nothing;

-- ── Rattacher les nouveaux exercices à leurs sous-groupes ────

with sg as (
  select id, slug from muscle_subgroups
)
update global_exercises ge
set subgroup_id = sg.id
from sg
where ge.subgroup_id is null
  and (
    -- Pectoraux supérieurs
    (sg.slug = 'chest_upper' and ge.name in (
      'Développé couché prise serrée', 'Pompes déclinées', 'Pompes archer'
    ))
    or
    -- Isolation pectoraux
    (sg.slug = 'chest_iso' and ge.name in (
      'Chest fly machine', 'Câble crossover'
    ))
    or
    -- Dorsaux
    (sg.slug = 'lats' and ge.name in (
      'T-bar row', 'Tirage nuque', 'Tirage bras tendus poulie haute', 'Tractions lestées'
    ))
    or
    -- Trapèzes
    (sg.slug = 'traps' and ge.name in (
      'Shrugs barre', 'Shrugs haltères'
    ))
    or
    -- Lombaires
    (sg.slug = 'lower_back' and ge.name in (
      'Hyperextension', 'Good morning barre', 'Rack pull'
    ))
    or
    -- Épaules antérieures
    (sg.slug = 'front_delt' and ge.name in (
      'Développé haltères assis', 'Rowing menton barre'
    ))
    or
    -- Épaules latérales
    (sg.slug = 'side_delt' and ge.name in (
      'Cable lateral raise'
    ))
    or
    -- Épaules postérieures
    (sg.slug = 'rear_delt' and ge.name in (
      'L-fly rotation externe', 'Tirage à la nuque buste penché'
    ))
    or
    -- Biceps
    (sg.slug = 'biceps' and ge.name in (
      'Curl araignée', 'Curl pupitre', 'Curl câble basse poulie', 'Curl barre EZ incliné'
    ))
    or
    -- Triceps
    (sg.slug = 'triceps' and ge.name in (
      'Extension triceps au-dessus tête', 'Extension triceps haltère',
      'Dips barres parallèles', 'Pushdown corde', 'Skullcrusher haltères'
    ))
    or
    -- Quadriceps
    (sg.slug = 'quads' and ge.name in (
      'Sumo squat', 'Goblet squat', 'Step-ups', 'Leg press unilatéral',
      'Sissy squat', 'Fentes arrière', 'Fentes marchées', 'Presse à cuisses unilatérale'
    ))
    or
    -- Ischio-jambiers
    (sg.slug = 'hamstrings' and ge.name in (
      'Nordic curl', 'Good morning haltères'
    ))
    or
    -- Grand fessier
    (sg.slug = 'glutes_main' and ge.name in (
      'Glute bridge barre', 'Donkey kicks poulie', 'Hip thrust unilatéral'
    ))
    or
    -- Moyen fessier
    (sg.slug = 'glutes_med' and ge.name in (
      'Abduction debout poulie', 'Clamshell'
    ))
    or
    -- Abdominaux
    (sg.slug = 'abs' and ge.name in (
      'Crunch vélo', 'Dead bug', 'Obliques câble', 'V-sit',
      'Crunch inverse', 'Dragon flag', 'Relevé de jambes suspendu'
    ))
    or
    -- Gainage / Stabilité
    (sg.slug = 'core_stab' and ge.name in (
      'Mountain climbers', 'Planche sur les mains', 'L-sit'
    ))
    or
    -- Cardio général
    (sg.slug = 'cardio_gen' and ge.muscle_group = 'cardio' and ge.subgroup_id is null)
    or
    -- Mobilité
    (sg.slug = 'mobility' and ge.muscle_group = 'other' and ge.subgroup_id is null)
  );
