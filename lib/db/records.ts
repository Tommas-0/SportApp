import { createClient } from "@/lib/supabase/server";
import { formatDurationSeconds } from "@/lib/exercise-validation";

export type ExerciseRecord = {
  exercise_id: string;
  name: string;
  muscle_group: string | null;
  best_weight_kg: number;
  reps_at_best: number;
  estimated_1rm: number;
  achieved_at: string;
};

export type CardioRecord = {
  exercise_id:      string;
  name:             string;
  muscle_group:     string | null;
  best_duration_s:  number;
  best_duration_fmt: string;
  achieved_at:      string;
};

export async function getAllTimeRecords(): Promise<ExerciseRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select(`
      exercise_id,
      weight_kg,
      reps,
      completed_at,
      exercise:exercises (name, muscle_group)
    `)
    .eq("is_warmup", false)
    .not("weight_kg", "is", null)
    .not("reps", "is", null)
    .order("weight_kg", { ascending: false });

  if (error) throw new Error(error.message);

  // Un record par exercice : meilleur poids, à égalité on préfère plus de reps
  const map = new Map<string, ExerciseRecord>();

  for (const row of data) {
    const weight = Number(row.weight_kg);
    const reps   = Number(row.reps);
    const ex     = row.exercise as unknown as { name: string; muscle_group: string | null };
    const existing = map.get(row.exercise_id);

    if (
      !existing ||
      weight > existing.best_weight_kg ||
      (weight === existing.best_weight_kg && reps > existing.reps_at_best)
    ) {
      map.set(row.exercise_id, {
        exercise_id:    row.exercise_id,
        name:           ex?.name ?? "Exercice",
        muscle_group:   ex?.muscle_group ?? null,
        best_weight_kg: weight,
        reps_at_best:   reps,
        estimated_1rm:  Math.round(weight * (1 + reps / 30) * 10) / 10,
        achieved_at:    row.completed_at.slice(0, 10),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function getAllTimeCardioRecords(): Promise<CardioRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select(`
      exercise_id,
      duration_seconds,
      completed_at,
      exercise:exercises (name, muscle_group, category, tracking_mode)
    `)
    .eq("is_warmup", false)
    .not("duration_seconds", "is", null)
    .order("duration_seconds", { ascending: false });

  if (error) throw new Error(error.message);

  console.log("[cardio-records] raw rows:", JSON.stringify(data?.slice(0, 3)));

  const map = new Map<string, CardioRecord>();

  for (const row of data) {
    const ex = row.exercise as unknown as { name: string; muscle_group: string | null; category: string; tracking_mode: string };
    if (!ex) continue;
    const isCardio = ex.category === "cardio"
      || ex.tracking_mode === "duration"
      || ex.muscle_group === "cardio";
    if (!isCardio) continue;

    const dur = Number(row.duration_seconds);
    if (!map.has(row.exercise_id) || dur > map.get(row.exercise_id)!.best_duration_s) {
      map.set(row.exercise_id, {
        exercise_id:       row.exercise_id,
        name:              ex.name,
        muscle_group:      ex.muscle_group,
        best_duration_s:   dur,
        best_duration_fmt: formatDurationSeconds(dur),
        achieved_at:       row.completed_at.slice(0, 10),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
