"use server";

import { revalidatePath } from "next/cache";
import {
  createExercise,
  updateExercise,
  deleteExercise,
  getExerciseUsage,
  getGlobalExercises,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from "@/lib/db/exercises";
import type { Exercise, GlobalExercise } from "@/types";

type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string };

export async function createExerciseAction(
  input: CreateExerciseInput
): Promise<ActionResult<Exercise>> {
  try {
    const exercise = await createExercise(input);
    revalidatePath("/exercises");
    revalidatePath("/templates");
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateExerciseAction(
  id: string,
  input: UpdateExerciseInput
): Promise<ActionResult<Exercise>> {
  try {
    const exercise = await updateExercise(id, input);
    revalidatePath("/exercises");
    revalidatePath("/templates");
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteExerciseAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteExercise(id);
    revalidatePath("/exercises");
    revalidatePath("/templates");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getExerciseUsageAction(
  id: string
): Promise<ActionResult<{ templateCount: number; setCount: number }>> {
  try {
    const usage = await getExerciseUsage(id);
    return { success: true, data: usage };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getGlobalExercisesAction(): Promise<ActionResult<GlobalExercise[]>> {
  try {
    const data = await getGlobalExercises();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
