-- ============================================================
-- Migration 019 : Affinement de la base d'exercices globaux
-- ============================================================
-- Stratégie :
--   • UPDATE  — renommages (conserve l'id, aucune FK cassée)
--   • INSERT ON CONFLICT DO NOTHING — ajouts sans doublons
-- ============================================================

-- ── 1. RENOMMAGES ────────────────────────────────────────────

-- Pectoraux
update global_exercises set name = 'Développé couché barre'        where name = 'Développé couché';
update global_exercises set name = 'Développé incliné barre'       where name = 'Développé incliné';
update global_exercises set name = 'Écarté poulie haute'           where name = 'Écarté poulie';
update global_exercises set name = 'Pec fly'                       where name = 'Pec deck';

-- Dos
update global_exercises set name = 'Rowing barre pronation'        where name = 'Rowing barre';
update global_exercises set name = 'Tirage vertical prise large'   where name = 'Tirage vertical';
update global_exercises set name = 'Tirage horizontal poulie'      where name = 'Tirage horizontal';
update global_exercises set name = 'Pull-over poulie'              where name = 'Pull-over';

-- Épaules
update global_exercises set name = 'Élévations latérales haltères' where name = 'Élévations latérales';
update global_exercises set name = 'Élévations frontales haltères' where name = 'Élévations frontales';

-- Jambes
update global_exercises set name = 'Leg press'                     where name = 'Presse à cuisses';

-- Bras
update global_exercises set name = 'Curl haltères'                 where name = 'Curl biceps';
update global_exercises set name = 'Extension triceps corde'       where name = 'Extension triceps poulie';

-- ── 2. AJOUTS ────────────────────────────────────────────────

insert into global_exercises (name, muscle_group, category, tracking_mode) values

  -- Pectoraux (variantes manquantes)
  ('Développé couché haltères',      'chest',     'strength', 'reps'),
  ('Développé incliné haltères',     'chest',     'strength', 'reps'),
  ('Écarté poulie basse',            'chest',     'strength', 'reps'),

  -- Dos (variantes manquantes)
  ('Rowing barre supination',        'back',      'strength', 'reps'),
  ('Tirage vertical prise serrée',   'back',      'strength', 'reps'),

  -- Épaules (variantes + manquants)
  ('Élévations latérales poulie',    'shoulders', 'strength', 'reps'),
  ('Élévations frontales poulie',    'shoulders', 'strength', 'reps'),
  ('Reverse pec fly',                'shoulders', 'strength', 'reps'),

  -- Bras (variantes curl + triceps)
  ('Curl barre',                     'arms',      'strength', 'reps'),
  ('Curl poulie',                    'arms',      'strength', 'reps'),
  ('Curl concentration',             'arms',      'strength', 'reps'),
  ('Extension triceps barre',        'arms',      'strength', 'reps'),

  -- Jambes (variantes manquantes)
  ('Hack squat',                     'legs',      'strength', 'reps'),
  ('Bulgarian split squat',          'legs',      'strength', 'reps'),
  ('Soulevé de terre jambes tendues','legs',      'strength', 'reps'),

  -- Core (variantes manquantes)
  ('Gainage lesté',                  'core',      'strength', 'duration'),
  ('Crunch machine',                 'core',      'strength', 'reps')

on conflict (name) do nothing;
