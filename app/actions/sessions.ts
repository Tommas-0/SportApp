"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  startSession,
  startFreeSession,
  endSession,
  deleteSession,
  createManualSession,
} from "@/lib/db/sessions";
import type { WorkoutSession, ManualSessionInput } from "@/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Lance une séance depuis un template et redirige vers la page active
export async function startSessionAction(templateId: string, date?: string): Promise<never> {
  const session = await startSession(templateId, date);
  redirect(`/sessions/active?id=${session.id}`);
}

// Lance une séance libre (sans template)
export async function startFreeSessionAction(name: string, date?: string): Promise<never> {
  const session = await startFreeSession(name, date);
  redirect(`/sessions/active?id=${session.id}`);
}

export async function endSessionAction(
  id: string,
  notes?: string,
  endedAt?: string,
): Promise<ActionResult<WorkoutSession>> {
  try {
    const session = await endSession(id, notes, endedAt);
    revalidatePath("/sessions");
    revalidatePath(`/sessions/${id}`);
    revalidatePath("/records");
    revalidatePath("/progress");
    return { success: true, data: session };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteSessionAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteSession(id);
    revalidatePath("/sessions");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// Annule une séance en cours (supprime session + tous ses sets via cascade)
export async function cancelSessionAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteSession(id);
    revalidatePath("/sessions");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createManualSessionAction(
  input: ManualSessionInput
): Promise<ActionResult<WorkoutSession>> {
  try {
    const session = await createManualSession(input);
    revalidatePath("/sessions");
    revalidatePath("/dashboard");
    revalidatePath("/records");
    revalidatePath("/progress");
    return { success: true, data: session };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
