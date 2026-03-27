import type { TrackingMode } from "@/types";

const QUEUE_KEY = "sport-tracker-sync-queue";

export type QueuedSet = {
  id:               string;
  session_id:       string;
  exercise_id:      string;
  set_number:       number;
  tracking_mode:    TrackingMode;
  reps?:            number;
  weight_kg?:       number;
  duration_seconds?: number;
  queued_at:        number;
};

export function getQueue(): QueuedSet[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addToQueue(item: Omit<QueuedSet, "id" | "queued_at">): void {
  const queue = getQueue();
  queue.push({ ...item, id: crypto.randomUUID(), queued_at: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
