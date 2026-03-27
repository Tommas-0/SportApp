import type { TrackingMode } from "@/types";

// ─── Types ────────────────────────────────────────────────────

export type SetMetrics = {
  reps?:             number | null;
  weight_kg?:        number | null;
  duration_seconds?: number | null;
};

export type ValidationError = {
  field:   string;
  message: string;
};

// ─── Validation ───────────────────────────────────────────────

/**
 * Valide les métriques d'une série selon le mode de suivi de l'exercice.
 * Retourne null si valide, sinon un tableau d'erreurs.
 */
export function validateSetMetrics(
  trackingMode: TrackingMode,
  metrics: SetMetrics
): ValidationError[] | null {
  const errors: ValidationError[] = [];

  switch (trackingMode) {
    case "reps":
      if (!metrics.reps || metrics.reps <= 0)
        errors.push({ field: "reps", message: "Le nombre de répétitions est requis" });
      if (metrics.weight_kg != null && metrics.weight_kg < 0)
        errors.push({ field: "weight_kg", message: "Le poids ne peut pas être négatif" });
      break;

    case "duration":
      if (!metrics.duration_seconds || metrics.duration_seconds <= 0)
        errors.push({ field: "duration_seconds", message: "La durée est requise" });
      break;

    case "reps_duration":
      if (!metrics.reps || metrics.reps <= 0)
        errors.push({ field: "reps", message: "Le nombre de répétitions est requis" });
      if (!metrics.duration_seconds || metrics.duration_seconds <= 0)
        errors.push({ field: "duration_seconds", message: "La durée est requise" });
      break;
  }

  return errors.length > 0 ? errors : null;
}

/**
 * Lève une erreur si les métriques ne sont pas valides.
 * À utiliser côté serveur avant tout insert.
 */
export function assertValidSetMetrics(
  trackingMode: TrackingMode,
  metrics: SetMetrics
): void {
  const errors = validateSetMetrics(trackingMode, metrics);
  if (errors) throw new Error(errors.map((e) => e.message).join(", "));
}

// ─── Helpers d'affichage ──────────────────────────────────────

/**
 * Résout le mode de suivi d'un exercice.
 * Fallback sur la category si tracking_mode est absent (migration pas encore appliquée).
 */
export function resolveTrackingMode(
  exercise?: {
    tracking_mode?: TrackingMode | null;
    category?:      string | null;
    muscle_group?:  string | null;
  } | null
): TrackingMode {
  // 1. Valeur explicite en base (priorité absolue)
  if (exercise?.tracking_mode) return exercise.tracking_mode;
  // 2. Infère depuis category
  const cat = exercise?.category;
  if (cat === "cardio" || cat === "flexibility" || cat === "mobility") return "duration";
  // 3. Infère depuis muscle_group (fallback si category est "strength" par erreur)
  const muscle = exercise?.muscle_group;
  if (muscle === "cardio") return "duration";
  return "reps";
}

export const TRACKING_MODE_LABEL: Record<TrackingMode, string> = {
  reps:          "Répétitions",
  duration:      "Durée",
  reps_duration: "Reps + Durée",
};

/**
 * Formate une durée en secondes → "1:30", "45 s", "2:05:10"
 */
export function formatDurationSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (m > 0) {
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${s} s`;
}

/**
 * Formate l'affichage d'une série selon le mode de suivi.
 * Ex : "80 kg × 8" | "1:30" | "12 × 45 s"
 */
export function formatSetDisplay(
  trackingMode: TrackingMode,
  metrics: SetMetrics
): string {
  switch (trackingMode) {
    case "reps": {
      const weight = metrics.weight_kg != null ? `${metrics.weight_kg} kg` : "PDC";
      const reps   = metrics.reps ?? "—";
      return `${weight} × ${reps}`;
    }
    case "duration": {
      return metrics.duration_seconds != null
        ? formatDurationSeconds(metrics.duration_seconds)
        : "—";
    }
    case "reps_duration": {
      const reps     = metrics.reps ?? "—";
      const duration = metrics.duration_seconds != null
        ? formatDurationSeconds(metrics.duration_seconds)
        : "—";
      return `${reps} × ${duration}`;
    }
  }
}

/**
 * Détermine si un set constitue un PR selon le mode de suivi.
 * Pour "reps"     → compare le poids (bestWeight en kg)
 * Pour "duration" → compare la durée (bestDuration en secondes, plus long = meilleur)
 * Pour hybride    → compare la durée
 */
export function isPR(
  trackingMode: TrackingMode,
  metrics: SetMetrics,
  previousBest: number   // poids (kg) ou durée (s) selon le mode
): boolean {
  switch (trackingMode) {
    case "reps":
      return (metrics.weight_kg ?? 0) > 0 && (metrics.weight_kg ?? 0) > previousBest;
    case "duration":
    case "reps_duration":
      return (metrics.duration_seconds ?? 0) > 0 && (metrics.duration_seconds ?? 0) > previousBest;
  }
}
