"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Exercise } from "@/types";

export function ExerciseSelector({
  exercises,
  selectedId,
}: {
  exercises: Exercise[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("exercise", e.target.value);
    } else {
      params.delete("exercise");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={selectedId ?? ""}
      onChange={handleChange}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
    >
      <option value="" disabled>Choisir un exercice…</option>
      {exercises.map((ex) => (
        <option key={ex.id} value={ex.id}>
          {ex.name}
          {ex.muscle_group ? ` — ${ex.muscle_group}` : ""}
        </option>
      ))}
    </select>
  );
}
