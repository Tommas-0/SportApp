"use server";

import { setFitnessGoal, upsertBMRProfile, type BMRProfile } from "@/lib/db/user-settings";
import { revalidatePath } from "next/cache";
import type { FitnessGoal } from "@/types";

export async function setFitnessGoalAction(goal: FitnessGoal) {
  await setFitnessGoal(goal);
  revalidatePath("/progress");
  revalidatePath("/calories");
}

export async function saveBMRProfileAction(profile: BMRProfile) {
  await upsertBMRProfile(profile);
  revalidatePath("/dashboard");
  revalidatePath("/body-stats");
}
