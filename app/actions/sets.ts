"use server";

import { revalidatePath } from "next/cache";
import {
  logSet,
  updateSet,
  deleteSet,
  saveSegments,
  type LogSetInput,
  type UpdateSetInput,
  type DropsetSegmentInput,
} from "@/lib/db/sets";
import type { WorkoutSet, SetSegment } from "@/types";

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
  input: UpdateSetInput,
  sessionId?: string
): Promise<ActionResult<WorkoutSet>> {
  try {
    const set = await updateSet(id, input);
    revalidatePath("/sessions/active");
    if (sessionId) revalidatePath(`/sessions/${sessionId}`);
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

export async function saveSegmentsAction(
  setId:    string,
  segments: DropsetSegmentInput[]
): Promise<ActionResult<SetSegment[]>> {
  try {
    const data = await saveSegments(setId, segments);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
