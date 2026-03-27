import { createClient } from "@/lib/supabase/server";
import type { DailyStep } from "@/types";

// ─── Lecture ──────────────────────────────────────────────────

/** Retourne les N derniers jours de données (ordonnés du plus récent au plus ancien). */
export async function getDailySteps(days = 30): Promise<DailyStep[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_steps")
    .select("*")
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Création / mise à jour ───────────────────────────────────

export type StepInput = {
  date:   string;
  steps:  number;
  notes?: string | null;
};

/** Upsert : met à jour si une entrée existe déjà pour ce jour. */
export async function upsertDailyStep(input: StepInput): Promise<DailyStep> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("daily_steps")
    .upsert(
      { ...input, user_id: user.id },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Suppression ──────────────────────────────────────────────

export async function deleteDailyStep(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("daily_steps")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
