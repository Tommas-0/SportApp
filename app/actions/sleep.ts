"use server";

import { revalidatePath } from "next/cache";
import {
  getDailySleep,
  upsertDailySleep,
  deleteDailySleep,
  type SleepInput,
} from "@/lib/db/sleep";
import type { DailySleep } from "@/types";

type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

export async function getDailySleepAction(days = 30): Promise<ActionResult<DailySleep[]>> {
  try {
    const data = await getDailySleep(days);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function upsertDailySleepAction(input: SleepInput): Promise<ActionResult<DailySleep>> {
  try {
    const data = await upsertDailySleep(input);
    revalidatePath("/sleep");
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteDailySleepAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteDailySleep(id);
    revalidatePath("/sleep");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
