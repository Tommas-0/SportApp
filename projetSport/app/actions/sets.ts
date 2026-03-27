"use server";

import { revalidatePath } from "next/cache";
import {
  logSet,
  updateSet,
  deleteSet,
  type LogSetInput,
  type UpdateSetInput,
} from "@/lib/db/sets";
import type { WorkoutSet } from "@/types";

type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

export async function logSetAction(
  input: LogSetInput
): Promise<ActionResult<WorkoutSet>> {
  try {
    const set = await logSet(input);
    revalidatePath("/sessions/active");
    return { success: true, data: set };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateSetAction(
  id: string,
  input: UpdateSetInput
): Promise<ActionResult<WorkoutSet>> {
  try {
    const set = await updateSet(id, input);
    revalidatePath("/sessions/active");
    return { success: true, data: set };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteSetAction(
  id:        string,
  sessionId: string
): Promise<ActionResult<void>> {
  try {
    await deleteSet(id);
    revalidatePath("/sessions/active");
    revalidatePath(`/sessions/${sessionId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
