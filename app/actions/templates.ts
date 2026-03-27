"use server";

import { revalidatePath } from "next/cache";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  upsertTemplateExercises,
  type CreateTemplateInput,
} from "@/lib/db/templates";
import type { WorkoutTemplate } from "@/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createTemplateAction(
  input: CreateTemplateInput
): Promise<ActionResult<WorkoutTemplate>> {
  try {
    const template = await createTemplate(input);
    revalidatePath("/templates");
    return { success: true, data: template };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateTemplateAction(
  id: string,
  input: Partial<Pick<WorkoutTemplate, "name" | "description">>
): Promise<ActionResult<WorkoutTemplate>> {
  try {
    const template = await updateTemplate(id, input);
    revalidatePath("/templates");
    revalidatePath(`/templates/${id}`);
    return { success: true, data: template };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function upsertTemplateExercisesAction(
  templateId: string,
  exercises: CreateTemplateInput["exercises"]
): Promise<ActionResult<void>> {
  try {
    await upsertTemplateExercises(templateId, exercises);
    revalidatePath(`/templates/${templateId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteTemplateAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteTemplate(id);
    revalidatePath("/templates");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
