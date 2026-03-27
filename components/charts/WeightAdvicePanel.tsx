"use client";

import { analyzeWeightData } from "@/lib/utils/weight-advice";
import type { WeightPoint } from "@/lib/db/stats";
import type { AdviceLevel, Trend } from "@/lib/utils/weight-advice";
import type { FitnessGoal } from "@/types";

const LEVEL_STYLES: Record<AdviceLevel, { border: string; bg: string; dot: string }> = {
  good:    { border: "border-green-800",  bg: "bg-green-950",  dot: "bg-green-400" },
  warning: { border: "border-amber-800",  bg: "bg-amber-950",  dot: "bg-amber-400" },
  info:    { border: "border-zinc-700",   bg: "bg-zinc-800",   dot: "bg-blue-400"  },
};

const TREND_LABEL: Record<Trend, { text: string; color: string }> = {
  losing:  { text: "↓ En perte",  color: "text-blue-400"  },
  gaining: { text: "↑ En prise",  color: "text-green-400" },
  stable:  { text: "→ Stable",    color: "text-zinc-400"  },
};

export function WeightAdvicePanel({ data, goal }: { data: WeightPoint[]; goal: FitnessGoal | null }) {
  const analysis = analyzeWeightData(data, goal);

  if (!analysis) {
    return (
      <div className="border border-zinc-700 bg-zinc-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <p className="text-sm font-medium text-white">Première mesure enregistrée</p>
        </div>
        <p className="text-sm text-zinc-400">
          Ajoute une 2ème mesure dans <strong className="text-white">Mesures corporelles</strong> pour voir l&apos;analyse de ta tendance et les conseils personnalisés.
        </p>
      </div>
    );
  }

  const {
    trend, weeklyRateKg,
    recentTrend, recentWeeklyRateKg,
    totalChangeKg, periodDays,
    advices,
  } = analysis;

  // Si les deux trends divergent, on met en avant le récent
  const displayTrend = recentTrend ?? trend;
  const displayRate  = recentWeeklyRateKg ?? weeklyRateKg;
  const trendStyle   = TREND_LABEL[displayTrend];
  const sign         = totalChangeKg > 0 ? "+" : "";

  return (
    <div className="space-y-4">
      {/* Résumé chiffré */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Tendance</p>
          <p className={`text-sm font-semibold ${trendStyle.color}`}>{trendStyle.text}</p>
        </div>
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Récent/sem</p>
          <p className="text-sm font-semibold text-white">
            {displayRate > 0 ? "+" : ""}{displayRate} kg
          </p>
        </div>
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Global/sem</p>
          <p className="text-sm font-semibold text-zinc-400">
            {weeklyRateKg > 0 ? "+" : ""}{weeklyRateKg} kg
          </p>
        </div>
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Total ({periodDays}j)</p>
          <p className="text-sm font-semibold text-white">{sign}{totalChangeKg} kg</p>
        </div>
      </div>

      {/* Note méthode */}
      <p className="text-xs text-zinc-600">
        Calculé par régression linéaire sur {data.length} mesure{data.length > 1 ? "s" : ""}.
        {recentWeeklyRateKg !== null && " Tendance récente = 28 derniers jours."}
      </p>

      {/* Conseils */}
      <div className="space-y-2">
        {advices.map((advice, i) => {
          const style = LEVEL_STYLES[advice.level];
          return (
            <div
              key={i}
              className={`border rounded-xl px-4 py-3 ${style.border} ${style.bg}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                <p className="text-sm font-medium text-white">{advice.label}</p>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{advice.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
