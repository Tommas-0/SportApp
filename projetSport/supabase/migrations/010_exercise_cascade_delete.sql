-- ============================================================
-- Migration 010 : Cascade delete pour les exercices
-- ============================================================
-- Passe template_exercises.exercise_id et workout_sets.exercise_id
-- de RESTRICT à CASCADE pour permettre la suppression d'un exercice
-- avec ses données liées.
-- ============================================================

-- template_exercises
ALTER TABLE template_exercises
  DROP CONSTRAINT template_exercises_exercise_id_fkey,
  ADD CONSTRAINT template_exercises_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

-- workout_sets
ALTER TABLE workout_sets
  DROP CONSTRAINT workout_sets_exercise_id_fkey,
  ADD CONSTRAINT workout_sets_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
