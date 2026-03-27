import { createClient } from "@/lib/supabase/server";
import { calculateSetKcal } from "@/lib/utils/fitness";

export type DayEnergy = {
  date:         string;  // YYYY-MM-DD
  stepsKcal:    number;
  exerciseKcal: number;
};

/**
 * Retourne les dépenses caloriques actives (pas + exercices) pour les N derniers jours.
 */
export async function getWeeklyEnergyData(
  weightKg: number,
  days = 7
): Promise<DayEnergy[]> {
  const supabase = await createClient();

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const since = dates[0];

  // Steps
  const { data: stepsRows } = await supabase
    .from("daily_steps")
    .select("date, steps")
    .gte("date", since);

  // Workout sets with exercise info (use completed_at to determine day)
  const { data: setsRows } = await supabase
    .from("workout_sets")
    .select("reps, weight_kg, duration_seconds, is_warmup, completed_at, exercise:exercises(tracking_mode, muscle_group, category)")
    .eq("is_warmup", false)
    .gte("completed_at", since + "T00:00:00Z");

  const stepsByDate = new Map(
    (stepsRows ?? []).map((s) => [s.date, s.steps])
  );

  const exKcalByDate = new Map<string, number>();
  for (const row of (setsRows ?? []) as any[]) {
    const date = (row.completed_at as string).slice(0, 10);
    const kcal = calculateSetKcal(
      {
        reps:             row.reps,
        weight_kg:        row.weight_kg,
        duration_seconds: row.duration_seconds,
        tracking_mode:    row.exercise?.tracking_mode,
        muscle_group:     row.exercise?.muscle_group,
        category:         row.exercise?.category,
        is_warmup:        false,
      },
      weightKg
    );
    exKcalByDate.set(date, (exKcalByDate.get(date) ?? 0) + kcal);
  }

  return dates.map((date) => {
    const steps    = stepsByDate.get(date) ?? 0;
    return {
      date,
      stepsKcal:    Math.round(steps * weightKg * 0.0006),
      exerciseKcal: Math.round(exKcalByDate.get(date) ?? 0),
    };
  });
}
