"use server";

import { revalidatePath } from "next/cache";
import {
  getDailyCalories,
  upsertDailyCalories,
  deleteDailyCalories,
  getEnergyBalance,
  type CaloriesInput,
} from "@/lib/db/calories";
import type { DailyCalories, EnergyBalance } from "@/types";

type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

export async function getDailyCaloriesAction(days = 30): Promise<ActionResult<DailyCalories[]>> {
  try {
    const data = await getDailyCalories(days);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getEnergyBalanceAction(
  weightKg: number,
  days = 30
): Promise<ActionResult<EnergyBalance[]>> {
  try {
    const data = await getEnergyBalance(weightKg, days);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function upsertDailyCaloriesAction(
  input: CaloriesInput
): Promise<ActionResult<DailyCalories>> {
  try {
    const data = await upsertDailyCalories(input);
    revalidatePath("/calories");
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteDailyCaloriesAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteDailyCalories(id);
    revalidatePath("/calories");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
