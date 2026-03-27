import { createClient } from "@/lib/supabase/server";
import type { BodyStat } from "@/types";

export async function getBodyStats(): Promise<BodyStat[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("body_stats")
    .select("*")
    .order("recorded_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export type BodyStatInput = Pick<
  BodyStat,
  "recorded_at" | "weight_kg" | "body_fat_pct" | "muscle_mass_kg" | "bone_mass_kg" | "height_cm" | "chest_cm" | "waist_cm" | "hips_cm" | "water_ml" | "hydration_pct" | "notes"
>;

export async function createBodyStat(input: BodyStatInput): Promise<BodyStat> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("body_stats")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateBodyStat(id: string, input: Partial<BodyStatInput>): Promise<BodyStat> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("body_stats")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBodyStat(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("body_stats")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
