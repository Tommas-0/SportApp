"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { WeightPoint } from "@/lib/db/stats";

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

type Props = { data: WeightPoint[] };

export function WeightChart({ data }: Props) {
  if (data.length === 0) {
    return <EmptyState message="Aucune mesure de poids enregistrée." />;
  }

  const weights = data.map((d) => d.weight_kg);
  const min = Math.floor(Math.min(...weights)) - 1;
  const max = Math.ceil(Math.max(...weights)) + 1;
  const latest = data[data.length - 1];
  const first = data[0];
  const diff = latest.weight_kg - first.weight_kg;

  return (
    <div className="space-y-3">
      {/* Méta */}
      <div className="flex items-center gap-6">
        <Stat label="Actuel" value={`${latest.weight_kg} kg`} />
        <Stat
          label="Évolution"
          value={`${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`}
          color={diff <= 0 ? "text-green-400" : "text-red-400"}
        />
        {latest.body_fat_pct && (
          <Stat label="Masse grasse" value={`${latest.body_fat_pct} %`} />
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}kg`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={((label: string) => formatDate(label)) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number) => [`${value} kg`, "Poids"]) as any}
          />
          <Line
            type="monotone"
            dataKey="weight_kg"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={{ fill: "#60a5fa", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`font-semibold text-sm ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-zinc-600 text-sm">{message}</p>
    </div>
  );
}
