import { createClient } from "@/lib/supabase/server";

export type CardioSegment = {
  id:         string;
  set_id:     string;
  started_at: string;
  ended_at:   string;
};

export async function saveCardioSegments(
  setId:    string,
  segments: Array<{ startedAt: number; endedAt: number }>
): Promise<void> {
  if (!segments.length) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("cardio_segments").insert(
    segments.map((s) => ({
      set_id:     setId,
      user_id:    user.id,
      started_at: new Date(s.startedAt).toISOString(),
      ended_at:   new Date(s.endedAt).toISOString(),
    }))
  );
}

export async function getSegmentsBySetId(setId: string): Promise<CardioSegment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cardio_segments")
    .select("id, set_id, started_at, ended_at")
    .eq("set_id", setId)
    .order("started_at");
  return data ?? [];
}

export async function getCardioHistory(
  exerciseId: string,
  limit = 20
): Promise<Array<{ date: string; duration_seconds: number; set_id: string }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sets")
    .select("id, duration_seconds, completed_at")
    .eq("exercise_id", exerciseId)
    .eq("is_warmup", false)
    .not("duration_seconds", "is", null)
    .order("completed_at", { ascending: true })
    .limit(limit);
  return (data ?? []).map((d) => ({
    date:             (d.completed_at as string).slice(0, 10),
    duration_seconds: d.duration_seconds as number,
    set_id:           d.id as string,
  }));
}
