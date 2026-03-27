import { createClient } from "@/lib/supabase/server";
import type { DailyCalories, EnergyBalance } from "@/types";
import { calculateSetKcal } from "@/lib/utils/fitness";

// ─── Lecture ──────────────────────────────────────────────────

export async function getDailyCalories(days = 30): Promise<DailyCalories[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_calories")
    .select("*")
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Bilan énergétique (ingéré vs brûlé) ─────────────────────

export async function getEnergyBalance(
  weightKg: number,
  days = 30
): Promise<EnergyBalance[]> {
  const supabase = await createClient();

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const since = dates[0];

  const [{ data: caloriesRows }, { data: stepsRows }, { data: setsRows }] =
    await Promise.all([
      supabase
        .from("daily_calories")
        .select("date, kcal_ingested")
        .gte("date", since),
      supabase
        .from("daily_steps")
        .select("date, steps")
        .gte("date", since),
      supabase
        .from("workout_sets")
        .select(
          "reps, weight_kg, duration_seconds, is_warmup, completed_at, exercise:exercises(tracking_mode, muscle_group, category)"
        )
        .eq("is_warmup", false)
        .gte("completed_at", since + "T00:00:00Z"),
    ]);

  const ingestedByDate = new Map(
    (caloriesRows ?? []).map((r) => [r.date, r.kcal_ingested])
  );
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
    const kcal_ingested = ingestedByDate.get(date) ?? 0;
    const steps         = stepsByDate.get(date) ?? 0;
    const stepsKcal     = Math.round(steps * weightKg * 0.0006);
    const exerciseKcal  = Math.round(exKcalByDate.get(date) ?? 0);
    const kcal_burned   = stepsKcal + exerciseKcal;
    return {
      date,
      kcal_ingested,
      kcal_burned,
      balance: kcal_ingested - kcal_burned,
    };
  });
}

// ─── Création / mise à jour ───────────────────────────────────

export type CaloriesInput = {
  date:          string;
  kcal_ingested: number;
  notes?:        string | null;
};

export async function upsertDailyCalories(
  input: CaloriesInput
): Promise<DailyCalories> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("daily_calories")
    .upsert(
      { ...input, user_id: user.id },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Suppression ──────────────────────────────────────────────

export async function deleteDailyCalories(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("daily_calories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
