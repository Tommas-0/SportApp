"use client";

import { useState } from "react";
import { startFreeSessionAction } from "@/app/actions/sessions";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function FreeSessionButton() {
  const [show,    setShow]    = useState(false);
  const [name,    setName]    = useState("");
  const [date,    setDate]    = useState(todayStr());
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    await startFreeSessionAction(name.trim() || "Séance libre", date);
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl py-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        Démarrer une séance libre
      </button>
    );
  }

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Séance libre</p>
      <input
        type="text"
        placeholder="Nom de la séance (optionnel)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleStart()}
        autoFocus
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
      />
      <input
        type="date"
        value={date}
        max={todayStr()}
        onChange={(e) => setDate(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
      />
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={loading}
          className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          {loading ? "Démarrage…" : "▶ Démarrer"}
        </button>
        <button
          onClick={() => { setShow(false); setName(""); setDate(todayStr()); }}
          className="px-4 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600 rounded-lg py-2 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
