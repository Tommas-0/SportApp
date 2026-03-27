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
import { formatDurationSeconds } from "@/lib/exercise-validation";

type Entry = { date: string; duration_seconds: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const secs = payload[0]?.value ?? 0;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-white font-semibold">{formatDurationSeconds(secs)}</p>
      <p className="text-zinc-600">{secs}s</p>
    </div>
  );
}

export function CardioProgressChart({
  data,
  exerciseName,
}: {
  data:         Entry[];
  exerciseName: string;
}) {
  if (!data.length) {
    return (
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">Progression cardio</p>
        <p className="text-xs text-zinc-600">Aucune donnée pour {exerciseName}.</p>
      </div>
    );
  }

  const best    = Math.max(...data.map((d) => d.duration_seconds));
  const chartData = data.map((d) => ({
    label: new Date(d.date + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    secs:  d.duration_seconds,
  }));

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Progression cardio</p>
        <p className="text-[11px] text-zinc-600">
          Record : <span className="text-orange-400 font-semibold">{formatDurationSeconds(best)}</span>
        </p>
      </div>

      <p className="text-xs text-zinc-400 font-medium truncate">{exerciseName}</p>

      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.floor(v / 60)}m`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272a" }} />
          <Bar dataKey="secs" fill="#ea580c" radius={[4, 4, 0, 0]} />
          <ReferenceLine
            y={best}
            stroke="#f97316"
            strokeDasharray="4 3"
            strokeOpacity={0.5}
            label={{ value: "PR", position: "insideTopRight", fill: "#f97316", fontSize: 8, opacity: 0.7 }}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-zinc-700">{data.length} séance{data.length > 1 ? "s" : ""} enregistrée{data.length > 1 ? "s" : ""}</p>
    </div>
  );
}
