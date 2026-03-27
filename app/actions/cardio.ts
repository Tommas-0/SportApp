"use server";

import { saveCardioSegments } from "@/lib/db/cardio-segments";

export async function saveCardioSegmentsAction(
  setId:    string,
  segments: Array<{ startedAt: number; endedAt: number }>
): Promise<void> {
  await saveCardioSegments(setId, segments);
}
