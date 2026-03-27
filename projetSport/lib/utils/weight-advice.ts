import type { WeightPoint } from "@/lib/db/stats";
import type { FitnessGoal } from "@/types";

// ─── Types ────────────────────────────────────────────────────

export type Trend = "losing" | "gaining" | "stable";

export type AdviceLevel = "good" | "warning" | "info";

export type WeightAdvice = {
  label: string;
  message: string;
  level: AdviceLevel;
};

export type WeightAnalysis = {
  trend: Trend;
  weeklyRateKg: number;
  recentWeeklyRateKg: number | null;
  recentTrend: Trend | null;
  totalChangeKg: number;
  periodDays: number;
  measurementGapDays: number;
  advices: WeightAdvice[];
};

// ─── Régression linéaire ─────────────────────────────────────

function linearRegressionSlope(data: WeightPoint[]): number {
  const n = data.length;
  if (n < 2) return 0;

  const xs = data.map((d) => new Date(d.date).getTime() / 86_400_000);
  const ys = data.map((d) => d.weight_kg);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);

  return den === 0 ? 0 : num / den;
}

function slopeToTrend(weeklyRate: number): Trend {
  if (Math.abs(weeklyRate) < 0.15) return "stable";
  return weeklyRate < 0 ? "losing" : "gaining";
}

// ─── Analyse principale ───────────────────────────────────────

export function analyzeWeightData(data: WeightPoint[], goal: FitnessGoal | null = null): WeightAnalysis | null {
  if (data.length < 2) return null;

  const first = data[0];
  const last  = data[data.length - 1];

  const periodDays = Math.round(
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000
  );
  if (periodDays < 1) return null;

  // ── Trend global ──
  const slopePerDay  = linearRegressionSlope(data);
  const weeklyRateKg = Math.round(slopePerDay * 7 * 100) / 100;
  const trend        = slopeToTrend(weeklyRateKg);

  // ── Trend récent (28j d'abord, fallback 60j si pas assez de points) ──
  let recentWeeklyRateKg: number | null = null;
  let recentTrend: Trend | null = null;

  for (const windowDays of [28, 60]) {
    const cutoff     = new Date(last.date);
    cutoff.setDate(cutoff.getDate() - windowDays);
    const recentData = data.filter((d) => new Date(d.date) >= cutoff);

    if (recentData.length >= 2) {
      const slope      = linearRegressionSlope(recentData);
      recentWeeklyRateKg = Math.round(slope * 7 * 100) / 100;
      recentTrend        = slopeToTrend(recentWeeklyRateKg);
      break;
    }
  }

  // ── Autres métriques ──
  const totalChangeKg = Math.round((last.weight_kg - first.weight_kg) * 10) / 10;

  const gaps = data.slice(1).map((p, i) =>
    (new Date(p.date).getTime() - new Date(data[i].date).getTime()) / 86_400_000
  );
  const measurementGapDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);

  const advices = buildAdvices({
    trend,
    recentTrend,
    weeklyRateKg,
    recentWeeklyRateKg,
    totalChangeKg,
    periodDays,
    measurementGapDays,
    hasBodyFat: last.body_fat_pct !== null,
    data,
    goal,
  });

  return { trend, weeklyRateKg, recentWeeklyRateKg, recentTrend, totalChangeKg, periodDays, measurementGapDays, advices };
}

// ─── Construction des conseils ────────────────────────────────

type AdviceInput = {
  trend: Trend;
  recentTrend: Trend | null;
  weeklyRateKg: number;
  recentWeeklyRateKg: number | null;
  totalChangeKg: number;
  periodDays: number;
  measurementGapDays: number;
  hasBodyFat: boolean;
  data: WeightPoint[];
  goal: FitnessGoal | null;
};

function buildAdvices(p: AdviceInput): WeightAdvice[] {
  const advices: WeightAdvice[] = [];

  // ── Données obsolètes ──
  const daysSinceLastMeasure = Math.round(
    (Date.now() - new Date(p.data[p.data.length - 1].date).getTime()) / 86_400_000
  );
  if (daysSinceLastMeasure > 14) {
    advices.push({
      label: "Données obsolètes",
      message: `Dernière pesée il y a ${daysSinceLastMeasure} jours. L'analyse reflète ta situation passée, pas actuelle. Ajoute une mesure pour des conseils à jour.`,
      level: "warning",
    });
  }

  // ── Pas assez de données ──
  if (p.data.length < 5) {
    advices.push({
      label: "Données insuffisantes",
      message: `Seulement ${p.data.length} mesures — la tendance calculée est indicative. La régression linéaire devient fiable à partir de 5–7 points.`,
      level: "info",
    });
  }

  // ── Inflexion récente ──
  if (p.recentTrend !== null && p.recentWeeklyRateKg !== null && p.recentTrend !== p.trend) {
    const sign = p.recentWeeklyRateKg > 0 ? "+" : "";
    advices.push({
      label: "Changement de tendance",
      message: `Tendance globale "${trendLabel(p.trend)}" mais sur les dernières semaines la courbe est "${trendLabel(p.recentTrend)}" (${sign}${p.recentWeeklyRateKg} kg/sem). La tendance récente est la plus pertinente.`,
      level: "info",
    });
  }

  const activeRate  = p.recentWeeklyRateKg ?? p.weeklyRateKg;
  const activeTrend = p.recentTrend ?? p.trend;

  // ── Conseils poids selon objectif ──
  if (p.goal === "bulk") {
    if (activeTrend === "losing") {
      advices.push({ label: "Attention — objectif bulk", message: `Tu perds ${Math.abs(activeRate)} kg/sem alors que ton objectif est la prise de masse. Augmente ton surplus calorique.`, level: "warning" });
    } else if (activeTrend === "gaining") {
      const rate = activeRate;
      if (rate >= 0.1 && rate <= 0.5) {
        advices.push({ label: "Lean bulk parfait", message: `+${rate} kg/semaine — rythme idéal pour un lean bulk. Tu maximises le muscle en limitant la graisse.`, level: "good" });
      } else if (rate > 0.5) {
        advices.push({ label: "Prise trop rapide", message: `+${rate} kg/semaine — tu prends probablement plus de gras que nécessaire. Réduis le surplus de 100–200 kcal.`, level: "warning" });
      } else {
        advices.push({ label: "Surplus insuffisant", message: `+${rate} kg/semaine — très lent pour une prise de masse. Augmente légèrement les calories pour progresser.`, level: "info" });
      }
    } else if (p.periodDays >= 21) {
      advices.push({ label: "Poids stable — augmente les calories", message: `Ton poids stagne alors que tu vises la prise de masse. Ajoute 150–200 kcal/jour pour relancer la progression.`, level: "info" });
    }

  } else if (p.goal === "cut") {
    if (activeTrend === "gaining") {
      advices.push({ label: "Attention — objectif sèche", message: `Tu prends +${activeRate} kg/sem alors que ton objectif est la sèche. Réduis ton apport calorique.`, level: "warning" });
    } else if (activeTrend === "losing") {
      const rate = Math.abs(activeRate);
      if (rate >= 0.25 && rate <= 1.0) {
        advices.push({ label: "Sèche idéale", message: `${rate} kg/semaine — dans la zone optimale (0.25–1 kg/sem). Ce rythme préserve bien la masse musculaire.`, level: "good" });
      } else if (rate > 1.0) {
        advices.push({ label: "Perte trop rapide", message: `${rate} kg/semaine — trop agressif. Au-delà de 1 kg/sem tu risques de cataboliser du muscle. Augmente légèrement les calories.`, level: "warning" });
      } else {
        advices.push({ label: "Déficit très léger", message: `${rate} kg/semaine — très progressif. Sûr pour le muscle, mais la sèche sera longue. Normal si tu débutes.`, level: "info" });
      }
    } else if (p.periodDays >= 21) {
      advices.push({ label: "Plateau — crée un déficit", message: `Ton poids stagne alors que tu vises la sèche. Réduis les calories de 150–200 kcal/jour ou augmente le cardio.`, level: "info" });
    }

  } else if (p.goal === "maintain") {
    if (activeTrend === "stable") {
      advices.push({ label: "Objectif maintenu ✓", message: `Poids stable sur ${p.periodDays} jours — exactement ce que tu vises. Continue sur ta lancée.`, level: "good" });
    } else if (activeTrend === "gaining") {
      const rate = activeRate;
      advices.push({
        label: rate > 0.3 ? "Dérive calorique" : "Légère prise",
        message: rate > 0.3
          ? `+${rate} kg/semaine — tu dépasses ton entretien. Surveille les apports ou augmente l'activité.`
          : `+${rate} kg/semaine — légère variation, surveille sur 2–3 semaines.`,
        level: rate > 0.3 ? "warning" : "info",
      });
    } else {
      const rate = Math.abs(activeRate);
      advices.push({
        label: rate > 0.3 ? "Perte involontaire" : "Légère perte",
        message: rate > 0.3
          ? `${rate} kg/semaine de perte — tu es en déficit. Augmente légèrement les calories si tu veux maintenir.`
          : `${rate} kg/semaine — légère variation normale, surveille sur quelques semaines.`,
        level: rate > 0.3 ? "warning" : "info",
      });
    }

  } else if (p.goal === "recomp") {
    if (activeTrend === "stable") {
      if (checkBodyFatDecline(p.data)) {
        advices.push({ label: "Recomposition en cours ✓", message: "Poids stable et masse grasse en baisse — parfait pour une recompo. Tu prends du muscle en perdant du gras simultanément.", level: "good" });
      } else {
        advices.push({ label: "Poids stable — bon signe", message: "Poids stable, conforme à ton objectif de recompo. Suis ta masse grasse pour confirmer la progression.", level: "good" });
      }
    } else if (activeTrend === "gaining") {
      advices.push({ label: "Légère prise", message: `+${activeRate} kg/sem. Pour une recompo, vise un poids plus stable. Réduis légèrement le surplus.`, level: "info" });
    } else {
      advices.push({ label: "Légère perte", message: `${Math.abs(activeRate)} kg/sem. Pour une recompo, vise un poids stable. Augmente légèrement les calories.`, level: "info" });
    }

  } else {
    // ── Pas d'objectif défini — messages neutres ──
    if (activeTrend === "losing") {
      const rate = Math.abs(activeRate);
      if (rate >= 0.25 && rate <= 1.0) {
        advices.push({ label: "Rythme de perte idéal", message: `${rate} kg/semaine — dans la zone optimale (0.25–1 kg/sem) pour préserver le muscle.`, level: "good" });
      } else if (rate > 1.0) {
        advices.push({ label: "Perte rapide", message: `${rate} kg/semaine — au-delà de 1 kg/sem tu risques de perdre du muscle. Définis ton objectif pour des conseils adaptés.`, level: "warning" });
      } else {
        advices.push({ label: "Perte lente", message: `${rate} kg/semaine — très progressif. Définis ton objectif ci-dessus pour des conseils personnalisés.`, level: "info" });
      }
    } else if (activeTrend === "gaining") {
      const rate = activeRate;
      if (rate >= 0.1 && rate <= 0.5) {
        advices.push({ label: "Prise de masse modérée", message: `+${rate} kg/semaine. Définis ton objectif pour savoir si c'est ce que tu vises.`, level: "info" });
      } else if (rate > 0.5) {
        advices.push({ label: "Prise rapide", message: `+${rate} kg/semaine — risque de prise de graisse. Définis ton objectif pour des conseils adaptés.`, level: "warning" });
      } else {
        advices.push({ label: "Prise légère", message: `+${rate} kg/semaine — stable ou légère prise. Définis ton objectif pour des conseils personnalisés.`, level: "info" });
      }
    } else if (p.periodDays >= 21) {
      if (checkBodyFatDecline(p.data)) {
        advices.push({ label: "Recomposition corporelle", message: "Poids stable mais masse grasse en baisse — tu prends du muscle en perdant du gras. Continue.", level: "good" });
      } else {
        advices.push({ label: "Plateau", message: `Poids stable depuis ${p.periodDays} jours. Définis ton objectif ci-dessus pour savoir si c'est voulu.`, level: "info" });
      }
    }
  }

  // ── Fréquence de pesée ──
  if (p.measurementGapDays > 7) {
    advices.push({ label: "Pesées trop espacées", message: `${p.measurementGapDays} jours entre chaque mesure en moyenne. Vise 1–2× par semaine, le matin à jeun.`, level: "warning" });
  } else if (p.measurementGapDays <= 2) {
    advices.push({ label: "Bonne régularité", message: `Tu te pèses tous les ${p.measurementGapDays} jours — très bien. Les fluctuations quotidiennes (±1–2 kg) sont normales.`, level: "good" });
  }

  // ── Variabilité (seulement sur fenêtre courte ≤ 21j) ──
  const recentPoints = p.data.slice(-7);
  if (recentPoints.length >= 3) {
    const spanDays =
      (new Date(recentPoints[recentPoints.length - 1].date).getTime() -
        new Date(recentPoints[0].date).getTime()) / 86_400_000;

    if (spanDays <= 21) {
      const weights   = recentPoints.map((d) => d.weight_kg);
      const amplitude = Math.max(...weights) - Math.min(...weights);
      if (amplitude > 2.5) {
        advices.push({
          label: "Fortes fluctuations",
          message: `Écart de ${amplitude.toFixed(1)} kg sur les ${Math.round(spanDays)} derniers jours. Normal si lié à l'hydratation ou aux repas — mesure-toi toujours dans les mêmes conditions (matin, à jeun).`,
          level: "info",
        });
      }
    }
  }

  // ── Body fat ──
  if (p.hasBodyFat) {
    advices.push({ label: "Suivi composition", message: "Tu suis ta masse grasse — super. Vérifie que la perte vient bien du gras (% MG doit baisser proportionnellement).", level: "info" });
  } else {
    advices.push({ label: "Ajoute la masse grasse", message: "Renseigne ton % de masse grasse dans chaque mesure pour savoir si tu perds du gras ou du muscle.", level: "info" });
  }

  return advices;
}

function trendLabel(t: Trend): string {
  return t === "losing" ? "perte" : t === "gaining" ? "prise" : "stable";
}

function checkBodyFatDecline(data: WeightPoint[]): boolean {
  const withFat = data.filter((d) => d.body_fat_pct !== null);
  if (withFat.length < 2) return false;
  return withFat[withFat.length - 1].body_fat_pct! < withFat[0].body_fat_pct! - 0.5;
}
