// ============================================================
// Exercices
// ============================================================
export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "arms"
  | "legs" | "glutes" | "core" | "cardio" | "other";

export type ExerciseCategory = "strength" | "cardio" | "flexibility" | "mobility";

/**
 * Détermine quelles métriques sont attendues pour un set :
 *   reps          → poids (optionnel) + répétitions
 *   duration      → durée en secondes uniquement
 *   reps_duration → répétitions ET durée (circuits, AMRAP, etc.)
 */
export type TrackingMode = "reps" | "duration" | "reps_duration";

export type MuscleSubgroup = {
  id: string;
  slug: string;
  name: string;
  group_id: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: MuscleGroup | null;
  category: ExerciseCategory;
  tracking_mode: TrackingMode;
  notes: string | null;
  subgroup_id: string | null;
  created_at: string;
  muscle_subgroup?: MuscleSubgroup;
};

// ============================================================
// Templates
// ============================================================
export type WorkoutTemplate = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  template_exercises?: TemplateExercise[];
};

export type TemplateExercise = {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  default_sets: number | null;
  default_reps: number | null;
  default_weight: number | null;
  default_duration_seconds: number | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at: string;
  exercise?: Exercise;
};

// ============================================================
// Sessions
// ============================================================
export type WorkoutSession = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  workout_sets?: WorkoutSet[];
};

export type SetSegment = {
  id: string;
  set_id: string;
  weight_kg: number | null;
  reps: number | null;
  order_index: number;
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  speed_kmh: number | null;
  incline_pct: number | null;
  resistance_level: number | null;
  rpe: number | null;
  is_warmup: boolean;
  completed_at: string;
  exercise?: Exercise;
  set_segments?: SetSegment[];
};

// Exercice global (partagé entre tous les utilisateurs, lecture seule)
export type GlobalExercise = {
  id: string;
  name: string;
  muscle_group: MuscleGroup | null;
  category: ExerciseCategory;
  tracking_mode: TrackingMode;
  notes: string | null;
  subgroup_id: string | null;
  created_at: string;
  muscle_subgroup?: MuscleSubgroup;
};

// ============================================================
// User settings
// ============================================================
export type FitnessGoal = "bulk" | "cut" | "maintain" | "recomp";

// ============================================================
// Body stats
// ============================================================
export type BodyStat = {
  id: string;
  user_id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  height_cm: number | null;
  hips_cm: number | null;
  water_ml: number | null;
  hydration_pct: number | null;
  bone_mass_kg: number | null;
  notes: string | null;
  created_at: string;
};

// ============================================================
// Daily steps
// ============================================================
export type DailyStep = {
  id:         string;
  user_id:    string;
  date:       string;   // YYYY-MM-DD
  steps:      number;
  notes:      string | null;
  created_at: string;
};

// ============================================================
// Daily sleep
// ============================================================
export type DailySleep = {
  id:         string;
  user_id:    string;
  date:       string;   // YYYY-MM-DD
  hours:      number;
  quality:    number | null; // 1–5
  notes:      string | null;
  created_at: string;
};

export type SleepAdvice = {
  level:   "danger" | "warning" | "ok" | "caution";
  label:   string;
  message: string;
};

// ============================================================
// Daily calories (ingérées)
// ============================================================
export type DailyCalories = {
  id:            string;
  user_id:       string;
  date:          string;   // YYYY-MM-DD
  kcal_ingested: number;
  notes:         string | null;
  created_at:    string;
};

export type EnergyBalance = {
  date:          string;
  kcal_ingested: number;
  kcal_burned:   number;  // steps + exercise
  balance:       number;  // ingested - burned (+ = surplus, - = déficit)
};

// ============================================================
// Manual session input
// ============================================================
export type ManualSetInput = {
  exercise_id:       string;
  set_number:        number;
  reps:              number | null;
  weight_kg:         number | null;
  duration_seconds:  number | null;
  rpe:               number | null;
  is_warmup:         boolean;
};

export type ManualSessionInput = {
  name:       string;
  date:       string;   // YYYY-MM-DD
  notes:      string | null;
  sets:       ManualSetInput[];
};
