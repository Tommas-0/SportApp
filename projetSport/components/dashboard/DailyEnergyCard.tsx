"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { calculateBMR } from "@/lib/utils/fitness";
import type { DayEnergy } from "@/lib/db/energy";
import type { BMRProfile } from "@/lib/db/user-settings";

function fmtDay(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short" });
}

function CustomTooltip({ active, payload, label, tdee }: any) {
  if (!active || !payload?.length) return null;
  const steps    = payload.find((p: any) => p.dataKey === "steps")?.value ?? 0;
  const exercise = payload.find((p: any) => p.dataKey === "exercice")?.value ?? 0;
  const total    = steps + exercise + (tdee ?? 0);
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1 capitalize">{label}</p>
      <p className="text-zinc-300">Pas : <span className="text-white font-medium">{steps} kcal</span></p>
      <p className="text-zinc-300">Exercices : <span className="text-white font-medium">{exercise} kcal</span></p>
      {tdee && <p className="text-zinc-300">TDEE : <span className="text-orange-400 font-medium">{tdee} kcal</span></p>}
      <p className="text-white font-semibold border-t border-zinc-800 mt-1 pt-1">Total : {total.toLocaleString("fr-FR")} kcal</p>
    </div>
  );
}

export function DailyEnergyCard({
  weightKg,
  heightCm,
  weekData,
  bmrProfile,
  todayIngestedKcal = null,
}: {
  weightKg:            number;
  heightCm:            number | null;
  weekData:            DayEnergy[];
  bmrProfile:          BMRProfile | null;
  todayIngestedKcal?:  number | null;
}) {
  const today     = new Date().toISOString().slice(0, 10);
  const todayData = weekData.find((d) => d.date === today) ?? { stepsKcal: 0, exerciseKcal: 0 };
  const activeKcal = todayData.stepsKcal + todayData.exerciseKcal;

  // TDEE basé sur le niveau d'activité sauvegardé (pas juste le BMR)
  let bmr:  number | null = null;
  let tdee: number | null = null;
  if (bmrProfile && heightCm) {
    const result = calculateBMR(weightKg, heightCm, bmrProfile.age, bmrProfile.gender);
    bmr  = result.bmr;
    tdee = result.tdee[bmrProfile.activityLevel];
  }

  const chartData = weekData.map((d) => ({
    label:    fmtDay(d.date),
    date:     d.date,
    steps:    d.stepsKcal,
    exercice: d.exerciseKcal,
  }));

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-4">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Énergie du jour</p>

      {/* Résumé aujourd'hui */}
      <div className="flex items-end justify-between">
        <div>
          {tdee && bmr ? (
            <>
              <p className="text-3xl font-bold text-white">{(activeKcal + tdee).toLocaleString("fr-FR")}</p>
              <p className="text-xs text-zinc-500 mt-0.5">kcal totales dépensées</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                {activeKcal.toLocaleString("fr-FR")} actives + TDEE {tdee.toLocaleString("fr-FR")}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-white">{activeKcal.toLocaleString("fr-FR")}</p>
              <p className="text-xs text-zinc-500 mt-0.5">kcal actives (pas + séances)</p>
            </>
          )}
        </div>
        {tdee && bmr && (
          <div className="text-right">
            <p className="text-[11px] text-zinc-500">
              TDEE <span className="text-orange-400 font-semibold">{tdee.toLocaleString("fr-FR")}</span> kcal
            </p>
            <p className="text-[10px] text-zinc-700 mt-0.5">
              BMR {bmr.toLocaleString("fr-FR")} + activité
            </p>
          </div>
        )}
      </div>

      {/* Détail dépenses */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Pas",       value: todayData.stepsKcal },
          { label: "Exercices", value: todayData.exerciseKcal },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-800/60 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-zinc-600 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-white">{value.toLocaleString("fr-FR")} kcal</p>
          </div>
        ))}
      </div>

      {/* Bilan calories ingérées */}
      {todayIngestedKcal != null && todayIngestedKcal > 0 && (() => {
        const burned  = tdee != null ? activeKcal + tdee : activeKcal;
        const balance = todayIngestedKcal - burned;
        const isSurplus = balance >= 0;
        return (
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Bilan calorique du jour</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Ingéré",  value: todayIngestedKcal, color: "text-emerald-400" },
                { label: "Brûlé",   value: Math.round(burned), color: "text-orange-400" },
                {
                  label:  isSurplus ? "Surplus" : "Déficit",
                  value:  Math.abs(balance),
                  color:  isSurplus ? "text-green-400" : "text-blue-400",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-800/60 rounded-xl px-2 py-2 text-center">
                  <p className="text-[9px] text-zinc-600 mb-0.5">{label}</p>
                  <p className={`text-xs font-bold ${color}`}>{Math.round(value).toLocaleString("fr-FR")}</p>
                  <p className="text-[8px] text-zinc-700">kcal</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {todayIngestedKcal == null && (
        <p className="text-[10px] text-zinc-700 border-t border-zinc-800 pt-2">
          <a href="/calories" className="text-zinc-600 hover:text-zinc-400 underline underline-offset-2">
            Ajoute tes calories ingérées
          </a>{" "}
          pour voir le bilan journalier complet.
        </p>
      )}

      {/* Graphique 7 jours */}
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-3">7 derniers jours</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} margin={{ top: 2, right: 0, left: -28, bottom: 0 }} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip content={(props) => <CustomTooltip {...props} tdee={tdee} />} cursor={{ fill: "#27272a" }} />
            <Bar dataKey="steps"    stackId="a" fill="#ea580c" opacity={0.75} radius={[0, 0, 0, 0]} />
            <Bar dataKey="exercice" stackId="a" fill="#fb923c"               radius={[3, 3, 0, 0]} />
            {tdee && (
              <ReferenceLine
                y={tdee}
                stroke="#f97316"
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{ value: "TDEE", position: "insideTopRight", fill: "#f97316", fontSize: 8, opacity: 0.7 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-end mt-1">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="w-2 h-2 rounded-sm bg-[#ea580c] shrink-0" /> Pas
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <span className="w-2 h-2 rounded-sm bg-[#fb923c] shrink-0" /> Exercices
          </span>
          {tdee && (
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <span className="w-3 border-t border-dashed border-orange-500/60 shrink-0" /> TDEE
            </span>
          )}
        </div>
      </div>

      {!bmrProfile && (
        <p className="text-[10px] text-zinc-600 border-t border-zinc-800 pt-2">
          Configure ton profil dans Mesures pour voir le TDEE et le total journalier.
        </p>
      )}
    </div>
  );
}
