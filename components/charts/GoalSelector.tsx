"use client";

import { useTransition } from "react";
import { setFitnessGoalAction } from "@/app/actions/user-settings";
import type { FitnessGoal } from "@/types";

const GOALS: { value: FitnessGoal; label: string; desc: string; color: string }[] = [
  { value: "bulk",     label: "Prise de masse", desc: "Lean bulk",    color: "border-green-700 bg-green-950 text-green-300" },
  { value: "cut",      label: "Sèche",          desc: "Déficit",      color: "border-blue-700 bg-blue-950 text-blue-300"   },
  { value: "maintain", label: "Maintien",        desc: "Entretien",    color: "border-zinc-600 bg-zinc-800 text-zinc-300"   },
  { value: "recomp",   label: "Recompo",         desc: "Stable + ↓%MG", color: "border-purple-700 bg-purple-950 text-purple-300" },
];

export function GoalSelector({ current }: { current: FitnessGoal | null }) {
  const [pending, startTransition] = useTransition();

  function select(goal: FitnessGoal) {
    startTransition(() => { setFitnessGoalAction(goal); });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">Ton objectif</p>
      <div className="grid grid-cols-2 gap-2">
        {GOALS.map((g) => {
          const isActive = current === g.value;
          return (
            <button
              key={g.value}
              onClick={() => select(g.value)}
              disabled={pending}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                isActive
                  ? g.color
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-white"
              } ${pending ? "opacity-60" : ""}`}
            >
              <p className="text-sm font-semibold leading-tight">{g.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{g.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
