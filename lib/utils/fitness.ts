// ============================================================
// Fonctions de calcul fitness
// ============================================================

// ─── Types ───────────────────────────────────────────────────

export type BMICategory =
  | "underweight"   // < 18.5
  | "normal"        // 18.5 – 24.9
  | "overweight"    // 25 – 29.9
  | "obese";        // ≥ 30

export type BMIResult = {
  value: number;
  category: BMICategory;
  label: string;
};

export type OneRMResult = {
  epley: number;
  brzycki: number | null;  // null si reps > 36 (formule invalide)
  lander: number;
  average: number;         // moyenne des formules valides
};

export type VolumeResult = {
  total: number;
  perSet: number;
};

// ─── IMC ─────────────────────────────────────────────────────

/**
 * Calcule l'Indice de Masse Corporelle.
 * Formule : IMC = poids(kg) / taille(m)²
 * Seuils OMS : <18.5 maigreur | 18.5–24.9 normal | 25–29.9 surpoids | ≥30 obésité
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  if (weightKg <= 0 || heightCm <= 0) {
    throw new Error("Le poids et la taille doivent être des valeurs positives.");
  }

  const heightM = heightCm / 100;
  const value = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  const { category, label } = getBMICategory(value);
  return { value, category, label };
}

function getBMICategory(bmi: number): { category: BMICategory; label: string } {
  if (bmi < 18.5) return { category: "underweight", label: "Maigreur" };
  if (bmi < 25)   return { category: "normal",      label: "Poids normal" };
  if (bmi < 30)   return { category: "overweight",  label: "Surpoids" };
  return           { category: "obese",             label: "Obésité" };
}

// ─── Volume d'entraînement ───────────────────────────────────

export function calculateVolume(
  weightKg: number,
  reps: number,
  sets: number
): VolumeResult {
  if (weightKg < 0 || reps <= 0 || sets <= 0) {
    throw new Error("Les valeurs doivent être positives (poids ≥ 0, reps > 0, séries > 0).");
  }
  return {
    total:  Math.round(weightKg * reps * sets * 10) / 10,
    perSet: Math.round(weightKg * reps * 10) / 10,
  };
}

export function calculateSessionVolume(
  sets: Array<{ weightKg: number; reps: number; isWarmup?: boolean }>,
  excludeWarmup = true
): number {
  const workingSets = excludeWarmup ? sets.filter((s) => !s.isWarmup) : sets;
  const total = workingSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  return Math.round(total * 10) / 10;
}

// ─── 1RM (One Rep Max) ───────────────────────────────────────

/**
 * Estime le 1RM à partir d'une série de N reps.
 *
 * Formules :
 *   Epley (1985)   : poids × (1 + reps/30)           — valide pour toutes les reps
 *   Brzycki (1993) : poids × 36/(37−reps)            — invalide au-delà de 36 reps
 *   Lander (1985)  : (100×poids)/(101.3−2.67123×reps) — valide jusqu'à ~37 reps
 *
 * Précision : toutes ces formules sont des estimations. La fiabilité
 * diminue significativement au-delà de 10 reps. Pour 1 rep, elles
 * retournent le poids tel quel (cas trivial exact).
 *
 * Pour reps > 36 : Brzycki est exclue de la moyenne (division par zéro ou résultat négatif).
 */
export function calculateOneRM(weightKg: number, reps: number): OneRMResult {
  if (weightKg <= 0) throw new Error("Le poids doit être positif.");
  if (reps <= 0)     throw new Error("Le nombre de reps doit être positif.");

  if (reps === 1) {
    return { epley: weightKg, brzycki: weightKg, lander: weightKg, average: weightKg };
  }

  const epley  = round1(weightKg * (1 + reps / 30));
  const lander = round1((100 * weightKg) / (101.3 - 2.67123 * reps));

  if (reps >= 37) {
    // Brzycki invalide (dénominateur ≤ 0) — on exclut de la moyenne
    return {
      epley,
      brzycki: null,
      lander,
      average: round1((epley + lander) / 2),
    };
  }

  const brzycki = round1(weightKg * (36 / (37 - reps)));
  return {
    epley,
    brzycki,
    lander,
    average: round1((epley + brzycki + lander) / 3),
  };
}

export function percentageOf1RM(weightKg: number, oneRM: number): number {
  if (oneRM <= 0) throw new Error("Le 1RM doit être positif.");
  return Math.round((weightKg / oneRM) * 1000) / 10;
}

export function weightFromPercentage(oneRM: number, percentage: number): number {
  if (oneRM <= 0 || percentage <= 0 || percentage > 100) {
    throw new Error("1RM doit être positif et le pourcentage entre 1 et 100.");
  }
  return round1(oneRM * (percentage / 100));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ─── BMR (Métabolisme de base) ────────────────────────────────

export type Gender = "male" | "female";

export type BMRResult = {
  bmr:   number;   // kcal/jour au repos
  tdee:  Record<ActivityLevel, number>;
};

export type ActivityLevel =
  | "sedentary"       // ×1.2   — peu ou pas d'exercice
  | "light"           // ×1.375 — exercice léger 1–3j/sem
  | "moderate"        // ×1.55  — exercice modéré 3–5j/sem
  | "active"          // ×1.725 — exercice intense 6–7j/sem
  | "very_active";    // ×1.9   — travail physique + sport quotidien

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   "Sédentaire (peu ou pas d'exercice)",
  light:       "Légèrement actif (1–3j/sem)",
  moderate:    "Modérément actif (3–5j/sem)",
  active:      "Très actif (6–7j/sem)",
  very_active: "Extrêmement actif (sport + travail physique)",
};

/**
 * Calcule le métabolisme de base (Mifflin-St Jeor, 1990).
 * Homme : 10×poids + 6.25×taille − 5×âge + 5
 * Femme : 10×poids + 6.25×taille − 5×âge − 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): BMRResult {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw new Error("Poids, taille et âge doivent être positifs.");
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr  = Math.round(gender === "male" ? base + 5 : base - 161);
  const tdee = Object.fromEntries(
    (Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((level) => [
      level,
      Math.round(bmr * ACTIVITY_MULTIPLIERS[level]),
    ])
  ) as Record<ActivityLevel, number>;
  return { bmr, tdee };
}

// ─── Estimation kcal par série ────────────────────────────────

export type SetKcalInput = {
  reps?:             number | null;
  weight_kg?:        number | null;
  duration_seconds?: number | null;
  tracking_mode?:    string | null;
  muscle_group?:     string | null;
  category?:         string | null;
  is_warmup?:        boolean;
  speed_kmh?:        number | null;
  incline_pct?:      number | null;
  resistance_level?: number | null;
};

function strengthMET(muscleGroup: string | null | undefined): number {
  switch (muscleGroup) {
    case "legs":
    case "glutes":    return 5.5;
    case "back":
    case "chest":     return 5.0;
    case "shoulders":
    case "arms":
    case "core":
    default:          return 4.5;
  }
}

function cardioMET(_muscleGroup: string | null | undefined): number {
  return 7.5;
}

/**
 * MET cardio précis selon les paramètres machine.
 *
 * Tapis (vitesse + inclinaison) : formule ACSM
 *   Marche (≤ 7.2 km/h) : VO2 = 0.1×v + 1.8×v×grade + 3.5
 *   Course (> 7.2 km/h) : VO2 = 0.2×v + 0.9×v×grade + 3.5
 *   MET = VO2 / 3.5  (v en m/min, grade décimal)
 *
 * Vélo / résistance : MET = 3.5 + resistance × 0.75
 *
 * Sans paramètre : MET par défaut selon groupe musculaire.
 */
function cardioMETWithParams(
  muscleGroup:   string | null | undefined,
  speedKmh:      number | null | undefined,
  inclinePct:    number | null | undefined,
  resistanceLvl: number | null | undefined
): number {
  if (speedKmh && speedKmh > 0) {
    const v     = speedKmh * (1000 / 60);                  // m/min
    const grade = (inclinePct ?? 0) / 100;
    const vo2   = speedKmh > 7.2
      ? 0.2 * v + 0.9 * v * grade + 3.5                   // course
      : 0.1 * v + 1.8 * v * grade + 3.5;                  // marche
    return Math.max(2, Math.round((vo2 / 3.5) * 10) / 10);
  }
  if (resistanceLvl && resistanceLvl > 0) {
    return Math.min(18, 3.5 + resistanceLvl * 0.75);
  }
  return cardioMET(muscleGroup);
}

/**
 * Estime les kcal dépensées sur une série.
 * - Durée (cardio/planche) : kcal = MET × poids × (durée / 3600)
 * - Reps (muscu)           : kcal = MET × poids × (reps × 3s / 3600) + charge × reps × 0.0005
 */
export function calculateSetKcal(set: SetKcalInput, bodyweightKg: number): number {
  if (set.is_warmup) return 0;
  const isCardio = set.category === "cardio" || set.muscle_group === "cardio";

  // Duration-based
  if (set.tracking_mode === "duration" || (set.tracking_mode === "reps_duration" && (set.duration_seconds ?? 0) > 0)) {
    const dur = set.duration_seconds ?? 0;
    if (dur <= 0) return 0;
    const met = isCardio
      ? cardioMETWithParams(set.muscle_group, set.speed_kmh, set.incline_pct, set.resistance_level)
      : strengthMET(set.muscle_group);
    return Math.round(met * bodyweightKg * (dur / 3600) * 10) / 10;
  }

  // Reps-based
  const reps = set.reps ?? 0;
  if (reps <= 0) return 0;
  const load = Number(set.weight_kg) || 0;
  const met  = isCardio ? cardioMET(set.muscle_group) : strengthMET(set.muscle_group);
  const metabolic   = met * bodyweightKg * (reps * 3 / 3600);
  const mechanical  = load * reps * 0.0005;
  return Math.round((metabolic + mechanical) * 10) / 10;
}

export type SegmentKcalInput = {
  weight_kg: number | null;
  reps:      number | null;
};

/**
 * Calcule les kcal d'un dropset (plusieurs segments enchaînés).
 * Chaque segment est une série reps-based (mode strength).
 */
export function calculateDropsetKcal(
  segments:     SegmentKcalInput[],
  muscleGroup:  string | null | undefined,
  bodyweightKg: number
): number {
  const met = strengthMET(muscleGroup);
  return Math.round(
    segments.reduce((sum, seg) => {
      const reps = seg.reps ?? 0;
      if (reps <= 0) return sum;
      const load       = Number(seg.weight_kg) || 0;
      const metabolic  = met * bodyweightKg * (reps * 3 / 3600);
      const mechanical = load * reps * 0.0005;
      return sum + metabolic + mechanical;
    }, 0) * 10
  ) / 10;
}

/**
 * Somme les kcal de toutes les séries travaillées d'une séance.
 */
export function calculateSessionKcal(sets: SetKcalInput[], bodyweightKg: number): number {
  return Math.round(
    sets.filter((s) => !s.is_warmup).reduce((sum, s) => sum + calculateSetKcal(s, bodyweightKg), 0)
  );
}
