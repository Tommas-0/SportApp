-- ============================================================
-- Migration 008 : Support de plusieurs modes de suivi d'exercice
-- ============================================================
--
-- Nouveau champ tracking_mode sur exercises :
--   reps          → musculation / poids de corps  (weight_kg nullable)
--   duration      → gainage, cardio, étirements
--   reps_duration → hybride (reps + temps, ex : circuits)
--
-- On ne touche PAS à exercises.category (strength/cardio/flexibility/mobility)
-- qui reste un axe organisationnel/filtrage indépendant.
-- ============================================================


-- ─── 1. exercises : ajout du mode de suivi ────────────────────────────────

alter table exercises
  add column tracking_mode text not null default 'reps'
    constraint exercises_tracking_mode_check
    check (tracking_mode in ('reps', 'duration', 'reps_duration'));

-- Migration automatique des exercices existants :
-- cardio / flexibility / mobility → mode durée par défaut
update exercises
  set tracking_mode = 'duration'
  where category in ('cardio', 'flexibility', 'mobility');

-- strength reste à 'reps' (default déjà appliqué)


-- ─── 2. template_exercises : valeur par défaut durée ──────────────────────

alter table template_exercises
  add column default_duration_seconds integer
    constraint template_exercises_default_duration_check
    check (default_duration_seconds > 0);


-- ─── 3. workout_sets : ajout du champ durée ───────────────────────────────

alter table workout_sets
  add column duration_seconds integer
    constraint workout_sets_duration_positive_check
    check (duration_seconds > 0);

-- Contrainte fonctionnelle : un set doit avoir au moins une métrique.
-- Les sets existants ont forcément reps ou weight_kg, donc pas de rupture.
alter table workout_sets
  add constraint workout_sets_has_metric_check
    check (
      reps             is not null or
      weight_kg        is not null or
      duration_seconds is not null
    );


-- ─── 4. Index utiles ──────────────────────────────────────────────────────

-- Records par exercice + date (PR durée comme PR poids)
create index idx_workout_sets_exercise_completed
  on workout_sets(exercise_id, completed_at desc);

-- Filtrage des exercices par mode dans l'UI
create index idx_exercises_user_tracking_mode
  on exercises(user_id, tracking_mode);
