import { createClient } from "@/lib/supabase/server";
import { assertValidSetMetrics } from "@/lib/exercise-validation";
import type { WorkoutSet, SetSegment, TrackingMode } from "@/types";

// ─── Lecture ──────────────────────────────────────────────────

export async function getSetsBySession(sessionId: string): Promise<WorkoutSet[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("*, exercise:exercises(*)")
    .eq("session_id", sessionId)
    .order("completed_at");

  if (error) throw new Error(error.message);
  return data;
}

export async function getSetsByExercise(exerciseId: string): Promise<WorkoutSet[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("*, workout_sessions!inner(user_id, started_at)")
    .eq("exercise_id", exerciseId)
    .eq("is_warmup", false)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Enregistrement d'une série ──────────────────────────────

export type DropsetSegmentInput = {
  weight_kg:   number | null;
  reps:        number | null;
  order_index: number;
};

export type LogSetInput = {
  session_id:        string;
  exercise_id:       string;
  set_number:        number;
  /** Mode de suivi de l'exercice — utilisé pour la validation uniquement, non stocké sur le set. */
  tracking_mode:     TrackingMode;
  reps?:             number;
  weight_kg?:        number;
  duration_seconds?: number;
  speed_kmh?:        number;
  incline_pct?:      number;
  resistance_level?: number;
  rpe?:              number;
  is_warmup?:        boolean;
  /** Segments dropset (optionnel — si absent, comportement classique) */
  segments?:         DropsetSegmentInput[];
};

export async function logSet(input: LogSetInput): Promise<WorkoutSet> {
  const { tracking_mode, speed_kmh, incline_pct, resistance_level, segments, ...rest } = input;

  // Validation métier avant tout accès base
  assertValidSetMetrics(tracking_mode, {
    reps:             rest.reps,
    weight_kg:        rest.weight_kg,
    duration_seconds: rest.duration_seconds,
  });

  const supabase = await createClient();

  const base = {
    ...rest,
    is_warmup:    rest.is_warmup ?? false,
    completed_at: new Date().toISOString(),
  };

  // Champs cardio optionnels (migration 014) — on les inclut seulement s'ils ont une valeur
  const cardio: Record<string, number> = {};
  if (speed_kmh        != null) cardio.speed_kmh        = speed_kmh;
  if (incline_pct      != null) cardio.incline_pct      = incline_pct;
  if (resistance_level != null) cardio.resistance_level = resistance_level;

  let { data, error } = await supabase
    .from("workout_sets")
    .insert({ ...base, ...cardio })
    .select("*, exercise:exercises(*)")
    .single();

  // Si les colonnes cardio n'existent pas encore (migration non appliquée), retry sans elles
  if (error && Object.keys(cardio).length > 0 && error.message.includes("column")) {
    ({ data, error } = await supabase
      .from("workout_sets")
      .insert(base)
      .select("*, exercise:exercises(*)")
      .single());
  }

  if (error) throw new Error(error.message);

  // Enregistrer les segments dropset si fournis (≥ 2 segments)
  if (segments && segments.length >= 2) {
    const supabaseForSegments = await createClient();
    await supabaseForSegments
      .from("set_segments")
      .insert(segments.map((seg) => ({ ...seg, set_id: data.id })));
    data.set_segments = segments.map((seg, i) => ({
      id: `pending-${i}`,
      set_id: data.id,
      ...seg,
      created_at: new Date().toISOString(),
    }));
  }

  return data;
}

// ─── Segments dropset ─────────────────────────────────────────

export async function getSegmentsBySetIds(setIds: string[]): Promise<Record<string, SetSegment[]>> {
  if (!setIds.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("set_segments")
    .select("*")
    .in("set_id", setIds)
    .order("order_index");

  if (error) throw new Error(error.message);

  const result: Record<string, SetSegment[]> = {};
  for (const seg of data) {
    if (!result[seg.set_id]) result[seg.set_id] = [];
    result[seg.set_id].push(seg as SetSegment);
  }
  return result;
}

export async function saveSegments(setId: string, segments: DropsetSegmentInput[]): Promise<SetSegment[]> {
  const supabase = await createClient();

  // Supprimer les anciens segments puis réinsérer
  await supabase.from("set_segments").delete().eq("set_id", setId);

  if (!segments.length) return [];

  const { data, error } = await supabase
    .from("set_segments")
    .insert(segments.map((seg) => ({ ...seg, set_id: setId })))
    .select();

  if (error) throw new Error(error.message);
  return data as SetSegment[];
}

// ─── Mise à jour / suppression ────────────────────────────────

export type UpdateSetInput = Partial<
  Pick<WorkoutSet, "reps" | "weight_kg" | "duration_seconds" | "rpe" | "is_warmup">
>;

export async function updateSet(id: string, input: UpdateSetInput): Promise<WorkoutSet> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .update(input)
    .eq("id", id)
    .select("*, exercise:exercises(*)")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSet(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── PR par poids (exercices "reps") ─────────────────────────

/** Dernière fois : sets du dernier workout terminé par exercice */
export async function getLastSetsForExercises(
  exerciseIds:      string[],
  currentSessionId: string
): Promise<Record<string, WorkoutSet[]>> {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("*, workout_sessions!inner(started_at, ended_at)")
    .in("exercise_id", exerciseIds)
    .neq("session_id", currentSessionId)
    .not("workout_sessions.ended_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(150);

  if (error) throw new Error(error.message);

  const latestSession: Record<string, string> = {};
  const result: Record<string, WorkoutSet[]>  = {};

  for (const row of data) {
    if (!latestSession[row.exercise_id]) {
      latestSession[row.exercise_id] = row.session_id;
      result[row.exercise_id]        = [];
    }
    if (latestSession[row.exercise_id] === row.session_id) {
      result[row.exercise_id].push(row as unknown as WorkoutSet);
    }
  }

  Object.keys(result).forEach((k) => result[k].reverse());
  return result;
}

/** Meilleure charge historique HORS session courante (comparaison PR poids) */
export async function getBestWeightsBeforeSession(
  exerciseIds:      string[],
  excludeSessionId: string
): Promise<Record<string, number>> {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight_kg")
    .in("exercise_id", exerciseIds)
    .neq("session_id", excludeSessionId)
    .eq("is_warmup", false)
    .not("weight_kg", "is", null);

  if (error) throw new Error(error.message);

  const result: Record<string, number> = {};
  for (const row of data) {
    const w = Number(row.weight_kg);
    if (!result[row.exercise_id] || w > result[row.exercise_id]) {
      result[row.exercise_id] = w;
    }
  }
  return result;
}

/** Meilleure charge historique par exercice (tous temps, pour la page Records) */
export async function getBestWeightsForExercises(
  exerciseIds: string[]
): Promise<Record<string, number>> {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight_kg")
    .in("exercise_id", exerciseIds)
    .eq("is_warmup", false)
    .not("weight_kg", "is", null);

  if (error) throw new Error(error.message);

  const result: Record<string, number> = {};
  for (const row of data) {
    const w = Number(row.weight_kg);
    if (!result[row.exercise_id] || w > result[row.exercise_id]) {
      result[row.exercise_id] = w;
    }
  }
  return result;
}

// ─── PR par durée (exercices "duration" / "reps_duration") ────

/** Meilleure durée historique HORS session courante */
export async function getBestDurationsBeforeSession(
  exerciseIds:      string[],
  excludeSessionId: string
): Promise<Record<string, number>> {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("exercise_id, duration_seconds")
    .in("exercise_id", exerciseIds)
    .neq("session_id", excludeSessionId)
    .eq("is_warmup", false)
    .not("duration_seconds", "is", null);

  if (error) throw new Error(error.message);

  const result: Record<string, number> = {};
  for (const row of data) {
    const d = Number(row.duration_seconds);
    if (!result[row.exercise_id] || d > result[row.exercise_id]) {
      result[row.exercise_id] = d;
    }
  }
  return result;
}

/** Meilleure durée tous temps par exercice */
export async function getBestDurationsForExercises(
  exerciseIds: string[]
): Promise<Record<string, number>> {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select("exercise_id, duration_seconds")
    .in("exercise_id", exerciseIds)
    .eq("is_warmup", false)
    .not("duration_seconds", "is", null);

  if (error) throw new Error(error.message);

  const result: Record<string, number> = {};
  for (const row of data) {
    const d = Number(row.duration_seconds);
    if (!result[row.exercise_id] || d > result[row.exercise_id]) {
      result[row.exercise_id] = d;
    }
  }
  return result;
}
