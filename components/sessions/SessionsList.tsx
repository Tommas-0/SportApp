"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { WorkoutSession } from "@/types";

type ViewMode = "month" | "week";
type Group    = { key: string; label: string; sessions: WorkoutSession[] };

function getMonday(dateStr: string): string {
  const d   = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("fr-FR", {
    month: "long", year: "numeric",
  });
}

function formatWeekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr + "T12:00:00Z");
  const sun = new Date(mondayStr + "T12:00:00Z");
  sun.setUTCDate(sun.getUTCDate() + 6);
  const monDay   = mon.getUTCDate();
  const sunDay   = sun.getUTCDate();
  const sunMonth = sun.toLocaleDateString("fr-FR", { month: "short" });
  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    return `${monDay}–${sunDay} ${sunMonth}`;
  }
  const monMonth = mon.toLocaleDateString("fr-FR", { month: "short" });
  return `${monDay} ${monMonth} – ${sunDay} ${sunMonth}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function formatDuration(started: string, ended: string | null) {
  if (!ended) return null;
  const min = Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 60000);
  const h   = Math.floor(min / 60);
  return h > 0 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${min} min`;
}

function groupSessions(sessions: WorkoutSession[], mode: ViewMode): Group[] {
  const map = new Map<string, WorkoutSession[]>();
  for (const s of sessions) {
    const date = s.started_at.slice(0, 10);
    const key  = mode === "month" ? date.slice(0, 7) : getMonday(date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return [...map.keys()].sort().reverse().map((key) => ({
    key,
    label:    mode === "month" ? formatMonthLabel(key) : formatWeekLabel(key),
    sessions: map.get(key)!,
  }));
}

export function SessionsList({ sessions }: { sessions: WorkoutSession[] }) {
  const [query,    setQuery]    = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const searching = query.trim().length > 0;

  const filtered = useMemo(() => {
    if (!searching) return sessions;
    const q = query.toLowerCase();
    return sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q) ||
        new Date(s.started_at).toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        }).toLowerCase().includes(q)
    );
  }, [sessions, query, searching]);

  const groups = useMemo(() => groupSessions(filtered, viewMode), [filtered, viewMode]);

  return (
    <div className="space-y-4">
      {/* Barre de recherche + toggle */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden shrink-0">
          {(["month", "week"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-2 text-xs transition-colors ${
                viewMode === mode ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {mode === "month" ? "Mois" : "Sem."}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-zinc-600 text-center py-16 text-sm">
          {searching ? `Aucun résultat pour « ${query} ».` : "Aucune séance enregistrée."}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs text-zinc-500 uppercase tracking-wide capitalize">{group.label}</h2>
                <span className="text-[11px] text-zinc-700">
                  {group.sessions.length} séance{group.sessions.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
                {group.sessions.map((s) => {
                  const duration = formatDuration(s.started_at, s.ended_at);
                  return (
                    <Link key={s.id} href={`/sessions/${s.id}`}>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{s.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {duration && <span className="text-xs text-zinc-600">{duration}</span>}
                            {s.notes && (
                              <span className="text-xs text-zinc-700 truncate max-w-[140px]">{s.notes}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-zinc-600 shrink-0 ml-3">{formatDate(s.started_at)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
