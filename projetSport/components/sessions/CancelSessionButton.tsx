"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSessionAction } from "@/app/actions/sessions";

export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [confirm,  setConfirm]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const res = await cancelSessionAction(sessionId);
    setLoading(false);
    if (!res.success) { setError(res.error); return; }
    router.replace("/sessions");
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="w-full text-sm text-zinc-500 hover:text-red-400 border border-dashed border-zinc-700 hover:border-red-500/40 rounded-xl py-2.5 transition-colors"
      >
        Annuler la séance
      </button>
    );
  }

  return (
    <div className="border border-red-500/30 bg-red-950/20 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-300 font-medium">
        Annuler cette séance ?
      </p>
      <p className="text-xs text-zinc-500">
        La séance et tous les sets enregistrés seront supprimés définitivement.
      </p>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirm(false)}
          disabled={loading}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2 rounded-xl transition-colors"
        >
          Garder
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
        >
          {loading ? "Suppression…" : "Confirmer"}
        </button>
      </div>
    </div>
  );
}
