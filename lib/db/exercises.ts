import { createClient } from "@/lib/supabase/server";
import type { Exercise, TrackingMode } from "@/types";

// ─── Lecture ──────────────────────────────────────────────────

export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

// ─── Création ─────────────────────────────────────────────────

export type CreateExerciseInput = Pick<
  Exercise,
  "name" | "muscle_group" | "category" | "tracking_mode" | "notes"
>;

export async function createExercise(
  input: CreateExerciseInput
): Promise<Exercise> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("exercises")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Mise à jour ──────────────────────────────────────────────

export type UpdateExerciseInput = Partial<
  Pick<Exercise, "name" | "muscle_group" | "category" | "tracking_mode" | "notes">
>;

export async function updateExercise(
  id: string,
  input: UpdateExerciseInput
): Promise<Exercise> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercises")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Suppression ──────────────────────────────────────────────

export async function deleteExercise(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Vérifie si un exercice est utilisé (template ou séance). */
export async function getExerciseUsage(id: string): Promise<{ templateCount: number; setCount: number }> {
  const supabase = await createClient();

  const [te, ws] = await Promise.all([
    supabase.from("template_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", id),
    supabase.from("workout_sets").select("id",       { count: "exact", head: true }).eq("exercise_id", id),
  ]);

  return {
    templateCount: te.count ?? 0,
    setCount:      ws.count ?? 0,
  };
}
