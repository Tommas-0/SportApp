import { createClient } from "@/lib/supabase/server";
import type { DailySleep } from "@/types";

// ─── Lecture ──────────────────────────────────────────────────

export async function getDailySleep(days = 30): Promise<DailySleep[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_sleep")
    .select("*")
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Création / mise à jour ───────────────────────────────────

export type SleepInput = {
  date:     string;
  hours:    number;
  quality?: number | null;
  notes?:   string | null;
};

export async function upsertDailySleep(input: SleepInput): Promise<DailySleep> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("daily_sleep")
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

export async function deleteDailySleep(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("daily_sleep")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
