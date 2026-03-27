import { createClient } from "@/lib/supabase/server";
import type { FitnessGoal } from "@/types";
import type { Gender, ActivityLevel } from "@/lib/utils/fitness";

export async function getFitnessGoal(): Promise<FitnessGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("fitness_goal")
    .maybeSingle();
  return (data?.fitness_goal as FitnessGoal) ?? null;
}

export async function setFitnessGoal(goal: FitnessGoal): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, fitness_goal: goal, updated_at: new Date().toISOString() });
}

export type BMRProfile = {
  age:           number;
  gender:        Gender;
  activityLevel: ActivityLevel;
};

export async function getBMRProfile(): Promise<BMRProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("age, gender, activity_level")
    .maybeSingle();
  if (!data?.age || !data?.gender || !data?.activity_level) return null;
  return {
    age:           data.age as number,
    gender:        data.gender as Gender,
    activityLevel: data.activity_level as ActivityLevel,
  };
}

export async function upsertBMRProfile(profile: BMRProfile): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_settings").upsert({
    user_id:        user.id,
    age:            profile.age,
    gender:         profile.gender,
    activity_level: profile.activityLevel,
    updated_at:     new Date().toISOString(),
  });
}
