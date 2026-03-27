"use client";

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ExerciseProgressPoint } from "@/lib/db/stats";

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "12px",
  color: "#fff",
  fontSize: 13,
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric", month: "short",
  });
}

// Arrondit vers le bas/haut au multiple de `step` le plus proche
function floorTo(value: number, step: number) {
  return Math.floor(value / step) * step;
}
function ceilTo(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

type Props = {
  data: ExerciseProgressPoint[];
  exerciseName: string;
};

export function ExerciseProgressChart({ data, exerciseName }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Aucune donnée pour cet exercice.</p>
      </div>
    );
  }

  const latest    = data[data.length - 1];
  const first     = data[0];
  const weightGain = Math.round((latest.best_weight_kg - first.best_weight_kg) * 10) / 10;
  const rmGain     = Math.round((latest.estimated_1rm  - first.estimated_1rm)  * 10) / 10;

  // Domaine Y : commence légèrement sous le minimum pour que la progression soit visible
  const allValues  = data.flatMap((d) => [d.best_weight_kg, d.estimated_1rm]);
  // Pour les stats (premier/dernier), on se base sur le tri chronologique déjà appliqué en DB
  const minVal     = Math.min(...allValues);
  const maxVal     = Math.max(...allValues);
  const range      = maxVal - minVal || 10;
  const step       = range <= 20 ? 5 : range <= 50 ? 10 : 20;
  const yMin       = floorTo(minVal - range * 0.15, step);
  const yMax       = ceilTo(maxVal  + range * 0.1,  step);

  return (
    <div className="space-y-3">
      {/* Méta */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Meilleure charge</p>
          <p className="font-semibold text-sm text-white">
            {latest.best_weight_kg} kg × {latest.best_reps}
          </p>
        </div>
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">1RM estimé</p>
          <p className="font-semibold text-sm text-purple-400">{latest.estimated_1rm} kg</p>
        </div>
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Progression</p>
          <p className={`font-semibold text-sm ${weightGain >= 0 ? "text-green-400" : "text-red-400"}`}>
            {weightGain >= 0 ? "+" : ""}{weightGain} kg
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="started_at"
            tickFormatter={(v) => formatDate(String(v).slice(0, 10))}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            unit=" kg"
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#fff" }}
            labelFormatter={(label) => {
              const point = data.find((d) => d.started_at === label);
              const dateStr = formatDate(String(label).slice(0, 10));
              return point?.session_name ? `${point.session_name} — ${dateStr}` : dateStr;
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number, name: string, props: any) => {
              if (name === "best_weight_kg") {
                const reps = props?.payload?.best_reps;
                return [`${value} kg × ${reps ?? "?"} reps`, "Charge"];
              }
              if (name === "estimated_1rm") return [`${value} kg`, "1RM estimé (Epley)"];
              return [`${value}`, name];
            }) as any}
          />
          <Legend
            formatter={(value) =>
              value === "best_weight_kg" ? "Charge" : "1RM estimé"
            }
            wrapperStyle={{ fontSize: 12, color: "#71717a" }}
          />
          {/* Barres : charge réelle */}
          <Bar
            dataKey="best_weight_kg"
            fill="#3b82f6"
            opacity={0.85}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          {/* Ligne : 1RM estimé */}
          <Line
            type="monotone"
            dataKey="estimated_1rm"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
            strokeDasharray="4 2"
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Note sur les variations de 1RM */}
      {data.length >= 2 && rmGain !== weightGain && (
        <p className="text-xs text-zinc-600">
          Le 1RM peut varier indépendamment de la charge si le nombre de reps change d&apos;une séance à l&apos;autre.
        </p>
      )}
      <p className="text-xs text-zinc-700 text-right">
        1RM estimé via Epley : poids × (1 + reps ÷ 30)
      </p>
    </div>
  );
}
