import { createClient } from "@/lib/supabase/server";

export type BadgeRawData = {
  totalSessions: number;
  sessionDates: string[];        // YYYY-MM-DD, triées ASC
  maxSessionVolume: number;      // kg
  totalVolume: number;           // kg, lifetime
  maxWeightEver: number;         // kg, tous exercices confondus
  bodyStatCount: number;
  firstWeightKg: number | null;
  latestWeightKg: number | null;
  firstBodyFatPct: number | null;
  latestBodyFatPct: number | null;
};

export async function getBadgeData(): Promise<BadgeRawData> {
  const supabase = await createClient();

  const [sessionsRes, setsRes, bodyRes] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at, workout_sets(reps, weight_kg, is_warmup)")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: true }),

    supabase
      .from("workout_sets")
      .select("weight_kg")
      .eq("is_warmup", false)
      .not("weight_kg", "is", null),

    supabase
      .from("body_stats")
      .select("weight_kg, body_fat_pct, recorded_at")
      .not("weight_kg", "is", null)
      .order("recorded_at", { ascending: true }),
  ]);

  const sessions = sessionsRes.data ?? [];
  const allSets  = setsRes.data ?? [];
  const body     = bodyRes.data ?? [];

  const sessionDates: string[] = [];
  let totalVolume = 0;
  let maxSessionVolume = 0;

  for (const s of sessions) {
    sessionDates.push(s.started_at.slice(0, 10));
    const workingSets = (s.workout_sets ?? []).filter((ws: { is_warmup: boolean }) => !ws.is_warmup);
    const vol = workingSets.reduce((sum: number, ws: { reps: number | null; weight_kg: number | null }) => {
      if (!ws.reps || !ws.weight_kg) return sum;
      return sum + Number(ws.reps) * Number(ws.weight_kg);
    }, 0);
    totalVolume += vol;
    if (vol > maxSessionVolume) maxSessionVolume = vol;
  }

  const maxWeightEver = allSets.reduce(
    (max, s) => Math.max(max, Number(s.weight_kg ?? 0)),
    0
  );

  const withFat = body.filter((b) => b.body_fat_pct !== null);

  return {
    totalSessions:    sessions.length,
    sessionDates,
    maxSessionVolume: Math.round(maxSessionVolume),
    totalVolume:      Math.round(totalVolume),
    maxWeightEver,
    bodyStatCount:    body.length,
    firstWeightKg:    body[0]?.weight_kg    ? Number(body[0].weight_kg)    : null,
    latestWeightKg:   body[body.length - 1]?.weight_kg ? Number(body[body.length - 1].weight_kg) : null,
    firstBodyFatPct:  withFat[0]?.body_fat_pct    ? Number(withFat[0].body_fat_pct)    : null,
    latestBodyFatPct: withFat[withFat.length - 1]?.body_fat_pct ? Number(withFat[withFat.length - 1].body_fat_pct) : null,
  };
}
