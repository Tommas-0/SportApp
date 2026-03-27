"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { SessionVolumePoint } from "@/lib/db/stats";

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "12px",
  color: "#fff",
  fontSize: 13,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatVolume(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`;
}

type Props = { data: SessionVolumePoint[] };

export function SessionVolumeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Aucune séance terminée.</p>
      </div>
    );
  }

  const volumes = data.map((d) => d.volume);
  const maxVolume = Math.max(...volumes);
  const avgVolume = Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);
  const totalSets = data.reduce((a, d) => a + d.total_sets, 0);

  return (
    <div className="space-y-3">
      {/* Méta */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-zinc-500">Volume max</p>
          <p className="font-semibold text-sm text-white">{formatVolume(maxVolume)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Volume moyen</p>
          <p className="font-semibold text-sm text-white">{formatVolume(avgVolume)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Séries totales</p>
          <p className="font-semibold text-sm text-white">{totalSets}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatVolume}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color: "#fff" }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={((label: string) => formatDate(label)) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number) => [`${formatVolume(value)}`, "Volume"]) as any}
          />
          <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.volume === maxVolume ? "#22c55e" : "#3b82f6"}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-zinc-600 text-right">
        Volume = Σ (reps × poids) par séance · Meilleure séance en vert
      </p>
    </div>
  );
}
