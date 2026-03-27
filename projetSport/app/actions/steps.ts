"use server";

import { revalidatePath } from "next/cache";
import {
  getDailySteps,
  upsertDailyStep,
  deleteDailyStep,
  type StepInput,
} from "@/lib/db/steps";
import type { DailyStep } from "@/types";

type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

export async function getDailyStepsAction(days = 30): Promise<ActionResult<DailyStep[]>> {
  try {
    const data = await getDailySteps(days);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function upsertDailyStepAction(input: StepInput): Promise<ActionResult<DailyStep>> {
  try {
    const data = await upsertDailyStep(input);
    revalidatePath("/steps");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteDailyStepAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteDailyStep(id);
    revalidatePath("/steps");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
