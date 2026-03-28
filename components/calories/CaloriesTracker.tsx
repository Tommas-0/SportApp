"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { upsertDailyCaloriesAction, deleteDailyCaloriesAction } from "@/app/actions/calories";
import { setFitnessGoalAction } from "@/app/actions/user-settings";
import type { DailyCalories, EnergyBalance, FitnessGoal } from "@/types";

// ─── Logique conseils ─────────────────────────────────────────

type BalanceAdvice = {
  level:   "deficit" | "surplus" | "neutral" | "extreme";
  label:   string;
  message: string;
};

function getBalanceAdvice(
  balance: number,
  goal: FitnessGoal | null,
  kcal_ingested: number,
  kcal_burned: number
): BalanceAdvice {
  const deficit = -balance; // positif = déficit calorique

  if (kcal_ingested === 0) {
    return {
      level: "neutral",
      label: "Aucune donnée",
      message: "Saisis tes calories du jour pour obtenir ton bilan.",
    };
  }

  if (goal === "cut") {
    if (deficit > 700)
      return {
        level: "extreme",
        label: "Déficit trop élevé",
        message: `Déficit de ${deficit.toLocaleString("fr-FR")} kcal — trop agressif pour la perte de gras. Risque de catabolisme musculaire et de fatigue. Vise 300–500 kcal de déficit max.`,
      };
    if (deficit >= 300)
      return {
        level: "deficit",
        label: "Déficit optimal (sèche)",
        message: `Déficit de ${deficit.toLocaleString("fr-FR")} kcal — parfait pour perdre du gras sans perdre le muscle. Continue à consommer suffisamment de protéines (1,8–2,2 g/kg).`,
      };
    if (deficit >= 0)
      return {
        level: "neutral",
        label: "Léger déficit",
        message: `Déficit de ${deficit.toLocaleString("fr-FR")} kcal — en dessous de l'objectif de sèche. Réduis légèrement les glucides ou augmente ton activité.`,
      };
    return {
      level: "surplus",
      label: "Surplus en sèche",
      message: `Surplus de ${(-deficit).toLocaleString("fr-FR")} kcal alors que ton objectif est la sèche. Réduis les portions ou les aliments caloriques.`,
    };
  }

  if (goal === "bulk") {
    if (balance > 700)
      return {
        level: "extreme",
        label: "Surplus excessif",
        message: `Surplus de ${balance.toLocaleString("fr-FR")} kcal — trop élevé. Au-delà de 500 kcal de surplus, le reste est stocké en graisse. Réduis légèrement les apports.`,
      };
    if (balance >= 200)
      return {
        level: "surplus",
        label: "Surplus optimal (prise de masse)",
        message: `Surplus de ${balance.toLocaleString("fr-FR")} kcal — idéal pour la prise de masse propre. Assure-toi d'avoir assez de protéines (1,8–2,2 g/kg) pour maximiser la synthèse musculaire.`,
      };
    if (balance >= 0)
      return {
        level: "neutral",
        label: "Maintenance (objectif bulk)",
        message: `Quasi-équilibre avec ${balance.toLocaleString("fr-FR")} kcal de surplus. Pour prendre de la masse efficacement, vise 200–400 kcal de surplus.`,
      };
    return {
      level: "deficit",
      label: "Déficit en prise de masse",
      message: `Déficit de ${deficit.toLocaleString("fr-FR")} kcal alors que tu veux prendre de la masse. Augmente les apports (glucides complexes, protéines).`,
    };
  }

  if (goal === "recomp") {
    const abs = Math.abs(balance);
    if (abs < 200)
      return {
        level: "neutral",
        label: "Recomposition : équilibre",
        message: `Quasi maintenance (${balance > 0 ? "+" : ""}${balance.toLocaleString("fr-FR")} kcal) — parfait pour la recomposition corporelle. Maintiens un apport élevé en protéines.`,
      };
    if (balance > 200)
      return {
        level: "surplus",
        label: "Surplus modéré (recompo)",
        message: `Surplus de ${balance.toLocaleString("fr-FR")} kcal — acceptable en recompo si c'est un jour d'entraînement intensif. Sinon, ajuste légèrement à la baisse.`,
      };
    return {
      level: "deficit",
      label: "Déficit modéré (recompo)",
      message: `Déficit de ${deficit.toLocaleString("fr-FR")} kcal — acceptable en recompo si c'est un jour de repos. Sur les jours de muscu, mange plus pour soutenir la récupération.`,
    };
  }

  // maintain ou null
  const abs = Math.abs(balance);
  if (abs < 150)
    return {
      level: "neutral",
      label: "Équilibre calorique",
      message: "Tu es quasi en maintenance — parfait pour maintenir ton poids. Continue comme ça.",
    };
  if (balance > 150)
    return {
      level: "surplus",
      label: "Léger surplus",
      message: `Surplus de ${balance.toLocaleString("fr-FR")} kcal. Si tu veux maintenir, réduis légèrement les portions demain.`,
    };
  return {
    level: "deficit",
    label: "Léger déficit",
    message: `Déficit de ${deficit.toLocaleString("fr-FR")} kcal. Si tu veux maintenir, mange un peu plus demain (féculents, fruits).`,
  };
}

const LEVEL_STYLE: Record<BalanceAdvice["level"], string> = {
  deficit: "border-blue-500/30  bg-blue-950/20  text-blue-300",
  surplus: "border-green-500/30 bg-green-950/20 text-green-300",
  neutral: "border-zinc-500/30  bg-zinc-800/30  text-zinc-300",
  extreme: "border-red-500/30   bg-red-950/20   text-red-300",
};

const LEVEL_ICON: Record<BalanceAdvice["level"], string> = {
  deficit: "📉", surplus: "📈", neutral: "⚖️", extreme: "⚠️",
};

// ─── Helpers ──────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric", month: "short",
  });
}

function fmtDateShort(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric", month: "numeric",
  });
}

// ─── Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as EnergyBalance & { label: string };
  const balance = d.kcal_ingested - d.kcal_burned;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{fmtDate(d.date)}</p>
      {d.kcal_ingested > 0 && (
        <p className="text-emerald-400">Ingéré : {d.kcal_ingested.toLocaleString("fr-FR")} kcal</p>
      )}
      {d.kcal_burned > 0 && (
        <p className="text-orange-400">Brûlé : {d.kcal_burned.toLocaleString("fr-FR")} kcal</p>
      )}
      {d.kcal_ingested > 0 && d.kcal_burned > 0 && (
        <p className={`font-semibold border-t border-zinc-800 mt-1 pt-1 ${balance >= 0 ? "text-green-400" : "text-blue-400"}`}>
          {balance >= 0 ? `+${balance}` : balance} kcal
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function CaloriesTracker({
  initial,
  energyBalance,
  fitnessGoal,
}: {
  initial:       DailyCalories[];
  energyBalance: EnergyBalance[];
  fitnessGoal:   FitnessGoal | null;
}) {
  const [entries,        setEntries]        = useState<DailyCalories[]>(initial);
  const [balance,        setBalance]        = useState<EnergyBalance[]>(energyBalance);
  const [date,           setDate]           = useState(todayStr());
  const [kcal,           setKcal]           = useState("");
  const [notes,          setNotes]          = useState("");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [goal,           setGoal]           = useState<FitnessGoal | null>(fitnessGoal);
  const [editingGoal,    setEditingGoal]    = useState(false);
  const [savingGoal,     setSavingGoal]     = useState(false);

  const todayEntry   = entries.find((e) => e.date === date);
  const todayBalance = balance.find((b) => b.date === todayStr());

  const todayAdvice = todayBalance
    ? getBalanceAdvice(
        todayBalance.balance,
        goal,
        todayBalance.kcal_ingested,
        todayBalance.kcal_burned
      )
    : null;

  async function handleGoalChange(newGoal: FitnessGoal) {
    setSavingGoal(true);
    await setFitnessGoalAction(newGoal);
    setGoal(newGoal);
    setSavingGoal(false);
    setEditingGoal(false);
  }

  const chartData = balance.map((b) => ({ ...b, label: fmtDateShort(b.date) }));

  const GOAL_LABEL: Record<FitnessGoal, string> = {
    bulk:     "Prise de masse",
    cut:      "Sèche",
    maintain: "Maintien",
    recomp:   "Recomposition",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const k = parseInt(kcal);
    if (!kcal || isNaN(k) || k <= 0) {
      setError("Valeur invalide");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await upsertDailyCaloriesAction({
      date,
      kcal_ingested: k,
      notes: notes || null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== res.data.date);
      return [res.data, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    // Met à jour le bilan du jour localement
    setBalance((prev) =>
      prev.map((b) =>
        b.date === date
          ? { ...b, kcal_ingested: k, balance: k - b.kcal_burned }
          : b
      )
    );
    setKcal("");
    setNotes("");
  }

  async function handleDelete(id: string, entryDate: string) {
    const res = await deleteDailyCaloriesAction(id);
    if (res.success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setBalance((prev) =>
        prev.map((b) =>
          b.date === entryDate
            ? { ...b, kcal_ingested: 0, balance: -b.kcal_burned }
            : b
        )
      );
    }
  }

  return (
    <div className="space-y-6">

      {/* Objectif actuel */}
      {!editingGoal ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <span className="text-xs text-zinc-500">Objectif actuel :</span>
          <span className="text-xs font-semibold text-white">
            {goal ? GOAL_LABEL[goal] : "Non défini"}
          </span>
          <button
            onClick={() => setEditingGoal(true)}
            className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Modifier →
          </button>
        </div>
      ) : (
        <div className="border border-zinc-700/50 bg-zinc-800/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Choisir un objectif</span>
            <button onClick={() => setEditingGoal(false)} className="text-[10px] text-zinc-600 hover:text-zinc-300">
              Annuler
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(GOAL_LABEL) as [FitnessGoal, string][]).map(([key, label]) => (
              <button
                key={key}
                disabled={savingGoal}
                onClick={() => handleGoalChange(key)}
                className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                  goal === key
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                } disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-4">
          Saisir les calories
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Calories ingérées (kcal)</label>
              <input
                type="number"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                placeholder={todayEntry ? String(todayEntry.kcal_ingested) : "2000"}
                min="0"
                step="50"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Notes (optionnel)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Repas du jour, cheat meal…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving ? "Enregistrement…" : todayEntry ? "Mettre à jour" : "Enregistrer"}
          </button>
        </form>
      </div>

      {/* Bilan du jour */}
      {todayBalance && todayBalance.kcal_ingested > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">Bilan du jour</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Ingéré",  value: todayBalance.kcal_ingested, color: "text-emerald-400" },
              { label: "Brûlé",   value: todayBalance.kcal_burned,   color: "text-orange-400"  },
              {
                label: todayBalance.balance >= 0 ? "Surplus" : "Déficit",
                value: Math.abs(todayBalance.balance),
                color: todayBalance.balance >= 0 ? "text-green-400" : "text-blue-400",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-800/60 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[10px] text-zinc-600 mb-1">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value.toLocaleString("fr-FR")}</p>
                <p className="text-[9px] text-zinc-600">kcal</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conseil */}
      {todayAdvice && todayBalance && todayBalance.kcal_ingested > 0 && (
        <div className={`border rounded-xl p-4 ${LEVEL_STYLE[todayAdvice.level]}`}>
          <p className="text-xs font-semibold mb-1">
            {LEVEL_ICON[todayAdvice.level]} {todayAdvice.label}
          </p>
          <p className="text-[12px] leading-relaxed opacity-90">{todayAdvice.message}</p>
        </div>
      )}

      {/* Graphique */}
      {balance.some((b) => b.kcal_ingested > 0 || b.kcal_burned > 0) && (
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">
            Bilan 30 jours — ingéré vs brûlé
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 8 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272a" }} />
              <Bar dataKey="kcal_ingested" name="Ingéré" fill="#10b981" opacity={0.75} radius={[3, 3, 0, 0]} />
              <Line
                dataKey="kcal_burned"
                name="Brûlé"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-end mt-1">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-2 h-2 rounded-sm bg-emerald-500 shrink-0" /> Ingéré
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-3 border-t-2 border-orange-500 shrink-0" /> Brûlé
            </span>
          </div>
        </div>
      )}

      {/* Historique */}
      {entries.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">Historique</p>
          <div className="space-y-2">
            {entries.slice(0, 14).map((e) => {
              const bal = balance.find((b) => b.date === e.date);
              const diff = bal ? e.kcal_ingested - bal.kcal_burned : null;
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-3 py-2.5"
                >
                  <div>
                    <p className="text-xs text-white font-medium">{fmtDate(e.date)}</p>
                    <p className="text-[11px] text-zinc-500">
                      {e.kcal_ingested.toLocaleString("fr-FR")} kcal ingérées
                      {diff !== null && bal && bal.kcal_burned > 0
                        ? ` · ${diff >= 0 ? "+" : ""}${diff.toLocaleString("fr-FR")} kcal`
                        : ""}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id, e.date)}
                    className="text-zinc-600 hover:text-red-400 text-xs transition-colors px-2 py-1"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-center text-zinc-600 text-sm py-6">
          Aucune donnée calorique. Commence par saisir aujourd'hui !
        </p>
      )}
    </div>
  );
}
