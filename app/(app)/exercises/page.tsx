import { getExercises } from "@/lib/db/exercises";
import { ExercisesLibrary } from "@/components/exercises/ExercisesLibrary";

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-white">Exercices</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{exercises.length} exercice{exercises.length > 1 ? "s" : ""}</p>
        </div>
        <ExercisesLibrary initial={exercises} />
      </div>
    </>
  );
}
