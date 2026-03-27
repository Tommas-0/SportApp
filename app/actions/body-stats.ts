"use server";

import { revalidatePath } from "next/cache";
import {
  createBodyStat,
  updateBodyStat,
  deleteBodyStat,
  type BodyStatInput,
} from "@/lib/db/body-stats";
import type { BodyStat } from "@/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createBodyStatAction(
  input: BodyStatInput
): Promise<ActionResult<BodyStat>> {
  try {
    const stat = await createBodyStat(input);
    revalidatePath("/body-stats");
    revalidatePath("/progress");
    return { success: true, data: stat };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateBodyStatAction(
  id: string,
  input: Partial<BodyStatInput>
): Promise<ActionResult<BodyStat>> {
  try {
    const stat = await updateBodyStat(id, input);
    revalidatePath("/body-stats");
    revalidatePath("/progress");
    return { success: true, data: stat };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBodyStatAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteBodyStat(id);
    revalidatePath("/body-stats");
    revalidatePath("/progress");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
