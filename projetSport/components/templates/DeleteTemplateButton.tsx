"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { deleteTemplateAction } from "@/app/actions/templates";

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm(`Supprimer le programme "${name}" ? Cette action est irréversible.`)) return;
    setLoading(true);
    await deleteTemplateAction(id);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="w-full py-2.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
    >
      {loading ? "…" : "Supprimer"}
    </button>
  );
}
