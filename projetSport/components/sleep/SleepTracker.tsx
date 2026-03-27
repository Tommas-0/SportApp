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
import { upsertDailySleepAction, deleteDailySleepAction } from "@/app/actions/sleep";
import type { DailySleep, SleepAdvice } from "@/types";

// ─── Logique conseils ─────────────────────────────────────────

function getSleepAdvice(hours: number, quality: number | null): SleepAdvice {
  const q = quality ?? 3;
  if (hours < 6) {
    return {
      level: "danger",
      label: "Récupération insuffisante",
      message:
        "Moins de 6h de sommeil nuit sérieusement à la récupération musculaire, " +
        "à la concentration et aux performances. Le corps ne synthétise pas " +
        "correctement les protéines et le cortisol reste élevé. Priorité absolue : " +
        "couche-toi plus tôt ce soir.",
    };
  }
  if (hours < 7) {
    return {
      level: "warning",
      label: "Sommeil moyen",
      message:
        "Entre 6 et 7h, la récupération est partielle. Tu peux t'entraîner " +
        "mais évite les séances très intenses. Ajoute une sieste de 20 min si possible " +
        `${q < 3 ? "et améliore la qualité de ton sommeil (obscurité, fraîcheur, pas d'écrans)" : "pour compenser"}.`,
    };
  }
  if (hours <= 9) {
    return {
      level: "ok",
      label: "Sommeil optimal",
      message:
        "7 à 9h : zone idéale pour la récupération musculaire, la synthèse protéique " +
        "et les performances cognitives. " +
        (q >= 4
          ? "Qualité excellente — ton corps récupère à plein régime."
          : q <= 2
          ? "Durée bonne mais qualité à améliorer : essaie de maintenir des horaires fixes."
          : "Continue comme ça."),
    };
  }
  return {
    level: "caution",
    label: "Possible sur-fatigue",
    message:
      "Plus de 9h peut indiquer une fatigue accumulée, un surentraînement ou " +
      "une hypersomnie. Vérifie ton niveau de stress et ton volume d'entraînement. " +
      "Si cela se répète, réduis l'intensité de tes séances.",
  };
}

const LEVEL_STYLE: Record<SleepAdvice["level"], string> = {
  danger:  "border-red-500/30 bg-red-950/20 text-red-300",
  warning: "border-amber-500/30 bg-amber-950/20 text-amber-300",
  ok:      "border-green-500/30 bg-green-950/20 text-green-300",
  caution: "border-yellow-500/30 bg-yellow-950/20 text-yellow-300",
};

const LEVEL_ICON: Record<SleepAdvice["level"], string> = {
  danger: "🔴", warning: "🟡", ok: "🟢", caution: "🟠",
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

function buildChartData(entries: DailySleep[], days = 14) {
  const map = new Map(entries.map((e) => [e.date, e]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const entry = map.get(date);
    result.push({
      date,
      label:   fmtDateShort(date),
      hours:   entry ? Number(entry.hours) : null,
      quality: entry?.quality ?? null,
    });
  }
  return result;
}

// ─── Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d.hours) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{fmtDate(d.date)}</p>
      <p className="text-white font-semibold">{d.hours}h de sommeil</p>
      {d.quality && (
        <p className="text-zinc-400">Qualité : {"⭐".repeat(d.quality)}</p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function SleepTracker({ initial }: { initial: DailySleep[] }) {
  const [entries, setEntries] = useState<DailySleep[]>(initial);
  const [date,    setDate]    = useState(todayStr());
  const [hours,   setHours]   = useState("");
  const [quality, setQuality] = useState<string>("");
  const [notes,   setNotes]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const chartData = buildChartData(entries, 14);

  // Dernière entrée pour les conseils
  const latestEntry = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const advice = latestEntry
    ? getSleepAdvice(Number(latestEntry.hours), latestEntry.quality)
    : null;

  // Entrée du jour pour pré-remplir
  const todayEntry = entries.find((e) => e.date === date);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = parseFloat(hours);
    if (!hours || isNaN(h) || h <= 0 || h > 24) {
      setError("Durée invalide (0–24h)");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await upsertDailySleepAction({
      date,
      hours:   h,
      quality: quality ? parseInt(quality) : null,
      notes:   notes || null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== res.data.date);
      return [res.data, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    setHours("");
    setQuality("");
    setNotes("");
  }

  async function handleDelete(id: string) {
    const res = await deleteDailySleepAction(id);
    if (res.success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="space-y-6">

      {/* Formulaire */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-4">
          Saisir le sommeil
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Durée (heures)</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder={todayEntry ? String(todayEntry.hours) : "7.5"}
                min="0"
                max="24"
                step="0.5"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">
              Qualité (optionnel)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(quality === String(q) ? "" : String(q))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quality === String(q)
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">1 = très mauvais · 5 = excellent</p>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Notes (optionnel)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rêves, réveils nocturnes…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving ? "Enregistrement…" : todayEntry ? "Mettre à jour" : "Enregistrer"}
          </button>
        </form>
      </div>

      {/* Conseil */}
      {advice && (
        <div className={`border rounded-xl p-4 ${LEVEL_STYLE[advice.level]}`}>
          <p className="text-xs font-semibold mb-1">
            {LEVEL_ICON[advice.level]} {advice.label}
          </p>
          <p className="text-[12px] leading-relaxed opacity-90">{advice.message}</p>
        </div>
      )}

      {/* Graphique */}
      {entries.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">
            14 derniers jours
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 12]} tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272a" }} />
              <ReferenceLine y={7} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.4}
                label={{ value: "7h", position: "insideTopRight", fill: "#6366f1", fontSize: 8, opacity: 0.6 }} />
              <ReferenceLine y={9} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.25}
                label={{ value: "9h", position: "insideTopRight", fill: "#6366f1", fontSize: 8, opacity: 0.4 }} />
              <Bar dataKey="hours" fill="#6366f1" opacity={0.8} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-end mt-1">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-2 h-2 rounded-sm bg-indigo-500 shrink-0" /> Sommeil (h)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-3 border-t border-dashed border-indigo-500/50 shrink-0" /> Zone optimale
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
              const adv = getSleepAdvice(Number(e.hours), e.quality);
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{LEVEL_ICON[adv.level]}</span>
                    <div>
                      <p className="text-xs text-white font-medium">{fmtDate(e.date)}</p>
                      <p className="text-[11px] text-zinc-500">
                        {e.hours}h
                        {e.quality ? ` · Qualité ${e.quality}/5` : ""}
                        {e.notes ? ` · ${e.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
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
          Aucune donnée de sommeil encore. Commence par saisir cette nuit !
        </p>
      )}
    </div>
  );
}
