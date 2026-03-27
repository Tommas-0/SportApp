import { createClient } from "@/lib/supabase/server";
import type { WorkoutTemplate, TemplateExercise } from "@/types";

// ─── Récupération ────────────────────────────────────────────

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_templates")
    .select("*, template_exercises(id)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getTemplateById(id: string): Promise<WorkoutTemplate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_templates")
    .select(`
      *,
      template_exercises (
        *,
        exercise:exercises (*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  // Trier les exercices par order_index
  if (data.template_exercises) {
    data.template_exercises.sort(
      (a: TemplateExercise, b: TemplateExercise) => a.order_index - b.order_index
    );
  }

  return data;
}

// ─── Création ────────────────────────────────────────────────

export type CreateTemplateInput = {
  name: string;
  description?: string;
  exercises: Array<{
    exercise_id: string;
    order_index: number;
    default_sets?: number;
    default_reps?: number;
    default_weight?: number;
    rest_seconds?: number;
    notes?: string;
  }>;
};

export async function createTemplate(
  input: CreateTemplateInput
): Promise<WorkoutTemplate> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Création du template
  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .insert({ name: input.name, description: input.description, user_id: user.id })
    .select()
    .single();

  if (templateError) throw new Error(templateError.message);

  // Ajout des exercices si fournis
  if (input.exercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from("template_exercises")
      .insert(
        input.exercises.map((ex) => ({ ...ex, template_id: template.id }))
      );

    if (exercisesError) throw new Error(exercisesError.message);
  }

  return getTemplateById(template.id);
}

// ─── Mise à jour ─────────────────────────────────────────────

export async function updateTemplate(
  id: string,
  input: Partial<Pick<WorkoutTemplate, "name" | "description">>
): Promise<WorkoutTemplate> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_templates")
    .update(input)
    .eq("id", id);

  if (error) throw new Error(error.message);
  return getTemplateById(id);
}

export async function upsertTemplateExercises(
  templateId: string,
  exercises: CreateTemplateInput["exercises"]
): Promise<void> {
  const supabase = await createClient();

  // Supprime les anciens exercices et réinsère
  const { error: deleteError } = await supabase
    .from("template_exercises")
    .delete()
    .eq("template_id", templateId);

  if (deleteError) throw new Error(deleteError.message);

  if (exercises.length > 0) {
    const { error } = await supabase
      .from("template_exercises")
      .insert(exercises.map((ex) => ({ ...ex, template_id: templateId })));

    if (error) throw new Error(error.message);
  }
}

// ─── Suppression ─────────────────────────────────────────────

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
