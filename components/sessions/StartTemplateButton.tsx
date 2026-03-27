"use client";

import { useState } from "react";
import { startSessionAction } from "@/app/actions/sessions";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function StartTemplateButton({ templateId }: { templateId: string }) {
  const [showPicker, setShowPicker] = useState(false);
  const [date,       setDate]       = useState(todayStr());
  const [loading,    setLoading]    = useState(false);

  async function handleStart() {
    setLoading(true);
    await startSessionAction(templateId, date);
  }

  if (!showPicker) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="w-full py-2.5 text-xs font-medium text-green-400 hover:bg-zinc-800/60 transition-colors"
      >
        ▶ Lancer
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        type="date"
        value={date}
        max={todayStr()}
        onChange={(e) => setDate(e.target.value)}
        autoFocus
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500 transition-colors"
      />
      <button
        onClick={handleStart}
        disabled={loading}
        className="text-xs font-medium text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors"
      >
        {loading ? "…" : "▶"}
      </button>
      <button
        onClick={() => { setShowPicker(false); setDate(todayStr()); }}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
