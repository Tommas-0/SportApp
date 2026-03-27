import { getExercises } from "@/lib/db/exercises";
import { getBodyStats } from "@/lib/db/body-stats";
import { ManualSessionForm } from "@/components/sessions/ManualSessionForm";

export default async function ManualSessionPage() {
  const [exercises, bodyStats] = await Promise.all([
    getExercises(),
    getBodyStats(),
  ]);

  const weightKg = Number(bodyStats.find((s) => s.weight_kg != null)?.weight_kg ?? 70);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-900/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-red-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto pb-10">
        <div>
          <h1 className="text-lg font-semibold text-white">Saisie manuelle</h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Enregistre une séance passée ou future avec une date personnalisée
          </p>
        </div>

        <ManualSessionForm exercises={exercises} weightKg={weightKg} />
      </div>
    </>
  );
}
