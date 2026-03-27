"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BodyCompPoint } from "@/lib/db/stats";

const SERIES = [
  { key: "body_fat_pct",   name: "Masse grasse (%)",    color: "#f59e0b" },
  { key: "muscle_mass_kg", name: "Masse musculaire (kg)", color: "#3b82f6" },
  { key: "bone_mass_kg",   name: "Masse osseuse (kg)",   color: "#a78bfa" },
  { key: "hydration_pct",  name: "Hydratation (%)",      color: "#34d399" },
] as const;

export function BodyCompositionChart({ data }: { data: BodyCompPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Aucune mesure enregistrée.</p>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  }));

  // Determine which series have at least one value
  const activeSeries = SERIES.filter((s) => data.some((d) => d[s.key] != null));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, color: "#fff" }}
          labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [`${value}`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }}
        />
        {activeSeries.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
