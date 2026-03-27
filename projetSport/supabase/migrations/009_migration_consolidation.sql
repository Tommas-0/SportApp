-- ============================================================
-- Migration 009 : Consolidation et vérification post-refactor
-- ============================================================
-- À exécuter APRÈS la migration 008.
-- Corrige les données existantes et ajoute des garde-fous.
-- ============================================================


-- ─── 1. S'assurer qu'aucun exercice n'a tracking_mode NULL ───
-- (la colonne a un DEFAULT 'reps' mais un UPDATE direct pourrait bypasser)
UPDATE exercises
  SET tracking_mode = 'reps'
  WHERE tracking_mode IS NULL;

-- S'assurer que les exercices cardio/mobilité sont bien en durée
UPDATE exercises
  SET tracking_mode = 'duration'
  WHERE category IN ('cardio', 'flexibility', 'mobility')
    AND tracking_mode = 'reps';   -- ne pas écraser un choix explicite de l'utilisateur


-- Cas spécifique : exercices créés avec l'ancien code (category='strength' hardcodé)
-- mais dont muscle_group='cardio' → ils ont hérité du DEFAULT 'reps' par erreur
UPDATE exercises
  SET tracking_mode = 'duration',
      category      = 'cardio'
  WHERE muscle_group = 'cardio'
    AND tracking_mode = 'reps';

-- ─── 2. Rendre tracking_mode NOT NULL maintenant que les données sont propres ──
-- (si la contrainte n'est pas encore là)
ALTER TABLE exercises
  ALTER COLUMN tracking_mode SET NOT NULL;


-- ─── 3. Vérification : aucun set orphelin sans métrique ──────
-- Les sets existants ont tous reps ou weight_kg, donc la
-- contrainte workout_sets_has_metric_check est déjà satisfaite.
-- Cette requête retourne 0 ligne si tout est propre :
--
--   SELECT id FROM workout_sets
--   WHERE reps IS NULL AND weight_kg IS NULL AND duration_seconds IS NULL;


-- ─── 4. Index de performance supplémentaires ─────────────────

-- Accès rapide aux sets d'une session par exercice (ActiveSession)
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_exercise
  ON workout_sets(session_id, exercise_id);

-- Recherche d'exercices par nom (autocomplete future)
CREATE INDEX IF NOT EXISTS idx_exercises_user_name
  ON exercises(user_id, name);
