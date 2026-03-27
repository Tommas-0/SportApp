"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSessionAction } from "@/app/actions/sessions";

export function DeleteSessionButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm("Supprimer cette séance ? Toutes les séries seront perdues.")) return;
    setLoading(true);
    await deleteSessionAction(id);
    router.push("/sessions");
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
    >
      {loading ? "…" : "Supprimer"}
    </button>
  );
}
