import { createClient } from "@/lib/supabase/server";

// ─── Types exportés ───────────────────────────────────────────

export type WeightPoint = {
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
};

export type BodyCompPoint = {
  date: string;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  hydration_pct: number | null;
};

export type ExerciseProgressPoint = {
  date: string;        // YYYY-MM-DD (pour l'affichage)
  started_at: string;  // ISO complet — clé unique même si 2 séances le même jour
  session_name: string;
  best_weight_kg: number;   // meilleure charge de la séance
  best_reps: number;        // reps associées à cette charge
  estimated_1rm: number;    // formule Epley : weight × (1 + reps/30)
};

export type SessionVolumePoint = {
  date: string;
  session_name: string;
  volume: number;           // somme(reps × poids) en kg
  total_sets: number;
};

// ─── Évolution du poids corporel ─────────────────────────────

export async function getWeightHistory(): Promise<WeightPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("body_stats")
    .select("recorded_at, weight_kg, body_fat_pct")
    .not("weight_kg", "is", null)
    .order("recorded_at", { ascending: true });

  if (error) throw new Error(error.message);

  return data.map((row) => ({
    date: row.recorded_at.slice(0, 10),
    weight_kg: Number(row.weight_kg),
    body_fat_pct: row.body_fat_pct ? Number(row.body_fat_pct) : null,
  }));
}

// ─── Progression sur un exercice ─────────────────────────────
// Meilleure charge (hors échauffement) par séance + 1RM estimé

export async function getExerciseProgress(
  exerciseId: string
): Promise<ExerciseProgressPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sets")
    .select(`
      weight_kg,
      reps,
      is_warmup,
      completed_at,
      workout_sessions!inner (
        id,
        name,
        started_at,
        user_id
      )
    `)
    .eq("exercise_id", exerciseId)
    .eq("is_warmup", false)
    .not("weight_kg", "is", null)
    .not("reps", "is", null)
    .order("completed_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Grouper par session, garder la meilleure charge
  const bySession = new Map<
    string,
    { started_at: string; name: string; weight: number; reps: number }
  >();

  for (const row of data) {
    const session = row.workout_sessions as unknown as {
      id: string; name: string; started_at: string;
    };
    const weight = Number(row.weight_kg);
    const reps = Number(row.reps);
    const existing = bySession.get(session.id);

    // On garde la charge max ; à égalité, on préfère + de reps
    if (!existing || weight > existing.weight || (weight === existing.weight && reps > existing.reps)) {
      bySession.set(session.id, {
        started_at: session.started_at,
        name: session.name,
        weight,
        reps,
      });
    }
  }

  return Array.from(bySession.values())
    // Tri chronologique garanti, indépendamment de l'ordre d'insertion dans la Map
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .map(({ started_at, name, weight, reps }) => ({
      date: started_at.slice(0, 10),
      started_at,
      session_name: name,
      best_weight_kg: weight,
      best_reps: reps,
      // Formule Epley : poids × (1 + reps / 30)
      estimated_1rm: Math.round(weight * (1 + reps / 30) * 10) / 10,
    }));
}

// ─── Volume total cette semaine ──────────────────────────────

export async function getWeeklyVolume(): Promise<number> {
  const supabase = await createClient();

  // Lundi de la semaine courante en UTC
  const now  = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("workout_sets")
    .select("reps, weight_kg, workout_sessions!inner(started_at, ended_at)")
    .eq("is_warmup", false)
    .not("reps", "is", null)
    .not("weight_kg", "is", null)
    .gte("workout_sessions.started_at", monday.toISOString())
    .not("workout_sessions.ended_at", "is", null);

  if (!data) return 0;
  return Math.round(
    data.reduce((sum, s) => sum + Number(s.reps) * Number(s.weight_kg), 0)
  );
}

// ─── Volume total par séance ──────────────────────────────────
// volume = somme(reps × poids) sur toutes les séries travaillées

export async function getSessionVolumes(
  limit = 15
): Promise<SessionVolumePoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      name,
      started_at,
      workout_sets (
        reps,
        weight_kg,
        is_warmup
      )
    `)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return data
    .map((session) => {
      const workingSets = (session.workout_sets ?? []).filter((s) => !s.is_warmup);
      const volume = workingSets.reduce((sum, s) => {
        if (!s.reps || !s.weight_kg) return sum;
        return sum + Number(s.reps) * Number(s.weight_kg);
      }, 0);

      return {
        date: session.started_at.slice(0, 10),
        session_name: session.name,
        volume: Math.round(volume),
        total_sets: workingSets.length,
      };
    })
    .reverse(); // ordre chronologique pour le graphique
}

// ─── Composition corporelle dans le temps ────────────────────

export async function getBodyCompositionHistory(): Promise<BodyCompPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("body_stats")
    .select("recorded_at, body_fat_pct, muscle_mass_kg, bone_mass_kg, hydration_pct")
    .order("recorded_at", { ascending: true });

  if (error) throw new Error(error.message);

  return data.map((row) => ({
    date: row.recorded_at.slice(0, 10),
    body_fat_pct:   row.body_fat_pct   ? Number(row.body_fat_pct)   : null,
    muscle_mass_kg: row.muscle_mass_kg ? Number(row.muscle_mass_kg) : null,
    bone_mass_kg:   row.bone_mass_kg   ? Number(row.bone_mass_kg)   : null,
    hydration_pct:  row.hydration_pct  ? Number(row.hydration_pct)  : null,
  }));
}
