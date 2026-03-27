"use client";

import { useState, useMemo, useEffect } from "react";
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
  Cell,
} from "recharts";
import { upsertDailyStepAction, deleteDailyStepAction } from "@/app/actions/steps";
import type { DailyStep } from "@/types";

const DEFAULT_GOAL = 10_000;
const GOAL_KEY = "steps_goal";

// ─── Formule calories ─────────────────────────────────────────
// kcal ≈ distance_km × poids_kg × 0.8
// distance_km ≈ pas × 0.00075 (foulée moyenne 75 cm)
function calcKcal(steps: number, weightKg: number): number {
  return Math.round(steps * weightKg * 0.0006);
}

// ─── Conseil selon niveau ─────────────────────────────────────
function getTip(steps: number, goal: number): { text: string; color: string } {
  if (steps === 0)       return { text: "Commence à marcher — chaque pas compte !", color: "text-zinc-500" };
  if (steps < 3_000)     return { text: "Mode sédentaire — essaie une courte balade de 15 min.", color: "text-red-400" };
  if (steps < 5_000)     return { text: "Peu actif — vise les 7 500 pas pour la journée.", color: "text-orange-400" };
  if (steps < 7_500)     return { text: "Légèrement actif — tu approches de la moitié !", color: "text-amber-400" };
  if (steps < goal)      return { text: `Plus que ${(goal - steps).toLocaleString("fr-FR")} pas pour atteindre l'objectif !`, color: "text-blue-400" };
  if (steps < goal * 1.5) return { text: "Objectif atteint ! Excellente journée active.", color: "text-green-400" };
  return { text: "Incroyable — tu dépasses largement l'objectif !", color: "text-emerald-400" };
}

// ─── Formatage ────────────────────────────────────────────────
function fmtSteps(n: number) {
  return n.toLocaleString("fr-FR");
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtDateShort(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Tooltip custom ───────────────────────────────────────────
function CustomTooltip({ active, payload, weightKg }: {
  active?:   boolean;
  payload?:  any[];
  weightKg:  number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { date: string; steps: number };
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{fmtDate(d.date)}</p>
      <p className="text-white font-semibold">{fmtSteps(d.steps)} pas</p>
      <p className="text-zinc-500">{fmtSteps(calcKcal(d.steps, weightKg))} kcal</p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function StepsTracker({
  initial,
  weightKg,
}: {
  initial:  DailyStep[];
  weightKg: number;
}) {
  const [entries,    setEntries]    = useState<DailyStep[]>(initial);
  const [date,       setDate]       = useState(todayStr());
  const [stepsRaw,   setStepsRaw]   = useState("");
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [goal,       setGoal]       = useState(DEFAULT_GOAL);
  const [editGoal,   setEditGoal]   = useState(false);
  const [goalRaw,    setGoalRaw]    = useState("");

  // Charge l'objectif depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem(GOAL_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (n > 0) setGoal(n);
    }
  }, []);

  function saveGoal() {
    const n = parseInt(goalRaw, 10);
    if (n > 0) {
      setGoal(n);
      localStorage.setItem(GOAL_KEY, String(n));
    }
    setEditGoal(false);
  }

  // Pré-remplis si une entrée existe déjà pour la date sélectionnée
  function handleDateChange(d: string) {
    setDate(d);
    const existing = entries.find((e) => e.date === d);
    if (existing) {
      setStepsRaw(String(existing.steps));
      setNotes(existing.notes ?? "");
    } else {
      setStepsRaw("");
      setNotes("");
    }
  }

  async function handleSave() {
    const steps = parseInt(stepsRaw, 10);
    if (!steps || steps <= 0) { setError("Nombre de pas invalide."); return; }
    setSaving(true);
    setError(null);
    const result = await upsertDailyStepAction({ date, steps, notes: notes || null });
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setEntries((prev) => {
      const without = prev.filter((e) => e.date !== result.data.date);
      return [...without, result.data].sort((a, b) => b.date.localeCompare(a.date));
    });
    setStepsRaw("");
    setNotes("");
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteDailyStepAction(id);
    setDeletingId(null);
    if (!result.success) { setError(result.error); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // ─── Données du graphe (14 derniers jours) ───────────────────
  const chartData = useMemo(() => {
    const byDate = new Map(entries.map((e) => [e.date, e.steps]));
    const days: { date: string; label: string; steps: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date:  key,
        label: fmtDateShort(key),
        steps: byDate.get(key) ?? 0,
      });
    }
    return days;
  }, [entries]);

  // ─── Stats globales ──────────────────────────────────────────
  const today      = todayStr();
  const todayEntry = entries.find((e) => e.date === today);
  const todaySteps = todayEntry?.steps ?? 0;
  const todayKcal  = calcKcal(todaySteps, weightKg);
  const tip        = getTip(todaySteps, goal);
  const pct        = Math.min(100, Math.round((todaySteps / goal) * 100));

  const validEntries = entries.filter((e) => e.steps > 0);
  const avgSteps     = validEntries.length
    ? Math.round(validEntries.reduce((sum, e) => sum + e.steps, 0) / validEntries.length)
    : 0;
  const totalKcal    = validEntries.reduce((sum, e) => sum + calcKcal(e.steps, weightKg), 0);

  return (
    <div className="space-y-4">

      {/* Carte aujourd'hui */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Aujourd'hui</p>
            <p className="text-3xl font-bold text-white mt-0.5">{fmtSteps(todaySteps)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{fmtSteps(todayKcal)} kcal dépensées</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-zinc-600">Objectif</p>
            {editGoal ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={goalRaw}
                  onChange={(e) => setGoalRaw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setEditGoal(false); }}
                  autoFocus
                  className="w-20 bg-zinc-800 border border-zinc-500 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 text-right"
                />
                <button onClick={saveGoal} className="w-7 h-7 flex items-center justify-center bg-orange-600 hover:bg-orange-500 rounded-lg text-white text-sm transition-colors">✓</button>
                <button onClick={() => setEditGoal(false)} className="w-7 h-7 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-sm transition-colors">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="text-sm font-semibold text-zinc-300">{fmtSteps(goal)}</span>
                <button
                  onClick={() => { setGoalRaw(String(goal)); setEditGoal(true); }}
                  className="w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
                  title="Modifier l'objectif"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-zinc-600 mb-1">
            <span>{pct}% de l'objectif</span>
            <span>{fmtSteps(Math.max(0, goal - todaySteps))} restants</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : pct >= 75 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-zinc-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Conseil */}
        <p className={`text-xs ${tip.color}`}>{tip.text}</p>
      </div>

      {/* Stats 30 jours */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Moy. journalière", value: fmtSteps(avgSteps) + " pas" },
          { label: "Total kcal (30j)",  value: fmtSteps(totalKcal) + " kcal" },
          { label: "Jours renseignés",  value: `${validEntries.length} / 30` },
        ].map(({ label, value }) => (
          <div key={label} className="border border-zinc-800 bg-zinc-900/60 rounded-xl px-3 py-3 text-center">
            <p className="text-[10px] text-zinc-600 mb-1 leading-tight">{label}</p>
            <p className="text-xs font-semibold text-white leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Graphique 14 jours */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-4">14 derniers jours</p>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#71717a", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
            />
            <Tooltip content={<CustomTooltip weightKg={weightKg} />} />
            <ReferenceLine
              y={goal}
              stroke="#22c55e"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: goal >= 1000 ? `${goal / 1000}k` : String(goal), fill: "#22c55e", fontSize: 9, position: "insideTopRight" }}
            />
            <Bar dataKey="steps" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.steps >= goal ? "#22c55e" : entry.steps > 0 ? "#3b82f6" : "#27272a"}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-end">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="w-2 h-2 rounded-sm bg-green-500 shrink-0" /> Objectif atteint
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" /> En cours
          </span>
        </div>
      </div>

      {/* Formulaire saisie */}
      {showForm ? (
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Saisir les pas</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Date</p>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Nombre de pas</p>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ex : 8500"
                value={stepsRaw}
                onChange={(e) => setStepsRaw(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {stepsRaw && parseInt(stepsRaw) > 0 && (
            <p className="text-xs text-zinc-500">
              ≈ {fmtSteps(calcKcal(parseInt(stepsRaw), weightKg))} kcal dépensées
            </p>
          )}

          <input
            type="text"
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-2 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowForm(true); handleDateChange(todayStr()); }}
          className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          + Saisir les pas (aujourd'hui ou un jour passé)
        </button>
      )}

      {/* Historique */}
      {entries.length > 0 && (
        <div>
          <p className="text-[11px] text-zinc-600 uppercase tracking-wide mb-2">Historique</p>
          <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
            {entries.slice(0, 14).map((e) => {
              const kcal = calcKcal(e.steps, weightKg);
              const p    = Math.min(100, Math.round((e.steps / goal) * 100));
              return (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{fmtSteps(e.steps)} pas</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{fmtDate(e.date)} · {fmtSteps(kcal)} kcal</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className={`text-[10px] font-medium ${e.steps >= goal ? "text-green-400" : "text-zinc-600"}`}>
                        {p}%
                      </span>
                      <button
                        onClick={() => { handleDateChange(e.date); setShowForm(true); }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                        className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {deletingId === e.id ? "…" : "×"}
                      </button>
                    </div>
                  </div>
                  {/* Mini barre */}
                  <div className="mt-2 w-full bg-zinc-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${e.steps >= goal ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  {e.notes && <p className="text-[10px] text-zinc-600 mt-1 italic">{e.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
