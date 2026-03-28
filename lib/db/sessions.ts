import { createClient } from "@/lib/supabase/server";
import type { WorkoutSession } from "@/types";
import type { ManualSessionInput } from "@/types";
import { getTemplateById } from "./templates";

// ─── Récupération ────────────────────────────────────────────

export async function getSessions(limit = 100): Promise<WorkoutSession[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

export async function getOpenSession(): Promise<WorkoutSession | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function getSessionById(id: string): Promise<WorkoutSession> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      *,
      workout_sets (
        *,
        exercise:exercises (*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Lancement d'une séance ───────────────────────────────────

export async function startSession(
  templateId: string,
  date?: string,
): Promise<WorkoutSession> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Récupère le nom du template pour le copier dans la session
  const template = await getTemplateById(templateId);

  const started_at = date
    ? new Date(`${date}T12:00:00`).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      template_id: templateId,
      name: template.name,
      started_at,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function startFreeSession(name: string, date?: string): Promise<WorkoutSession> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const started_at = date
    ? new Date(`${date}T12:00:00`).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      name,
      started_at,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Terminer une séance ─────────────────────────────────────

export async function endSession(
  id: string,
  notes?: string,
  endedAt?: string,
): Promise<WorkoutSession> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: endedAt ?? new Date().toISOString(), notes })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Mise à jour ─────────────────────────────────────────────

export async function updateSession(
  id: string,
  input: { name?: string; notes?: string | null }
): Promise<WorkoutSession> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sessions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Suppression ─────────────────────────────────────────────

export async function deleteSession(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Saisie manuelle d'une séance complète ────────────────────

/**
 * Crée une séance terminée avec tous ses sets en une seule opération.
 * La séance est immédiatement marquée comme terminée (ended_at = started_at + durée estimée).
 */
export async function createManualSession(
  input: ManualSessionInput
): Promise<WorkoutSession> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const started_at = new Date(`${input.date}T12:00:00`).toISOString();
  const ended_at   = new Date(`${input.date}T13:00:00`).toISOString();

  // Crée la session
  const { data: session, error: sessErr } = await supabase
    .from("workout_sessions")
    .insert({
      user_id:    user.id,
      name:       input.name,
      notes:      input.notes ?? null,
      started_at,
      ended_at,
    })
    .select()
    .single();

  if (sessErr) throw new Error(sessErr.message);

  // Insère tous les sets
  if (input.sets.length > 0) {
    const rows = input.sets.map((s) => ({
      session_id:       session.id,
      exercise_id:      s.exercise_id,
      set_number:       s.set_number,
      reps:             s.reps    ?? null,
      weight_kg:        s.weight_kg ?? null,
      duration_seconds: s.duration_seconds ?? null,
      rpe:              s.rpe    ?? null,
      is_warmup:        s.is_warmup,
      completed_at:     started_at,
    }));

    const { error: setsErr } = await supabase
      .from("workout_sets")
      .insert(rows);

    if (setsErr) {
      // Rollback : supprime la session si l'insertion des sets échoue
      await supabase.from("workout_sessions").delete().eq("id", session.id);
      throw new Error(setsErr.message);
    }
  }

  return session;
}
