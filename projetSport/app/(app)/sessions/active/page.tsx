import { redirect } from "next/navigation";
import { getSessionById } from "@/lib/db/sessions";
import { getTemplateById } from "@/lib/db/templates";
import {
  getLastSetsForExercises,
  getBestWeightsForExercises,
  getBestDurationsForExercises,
} from "@/lib/db/sets";
import { getExercises } from "@/lib/db/exercises";
import { ActiveSession } from "@/components/sessions/ActiveSession";

export default async function ActiveSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) redirect("/templates");

  const session  = await getSessionById(id);
  const template = session.template_id ? await getTemplateById(session.template_id) : null;

  const templateExercises = template?.template_exercises ?? [];
  const exerciseIds       = templateExercises.map((te) => te.exercise_id);

  const [lastSets, bestWeights, bestDurations, allExercises] = await Promise.all([
    getLastSetsForExercises(exerciseIds, id),
    getBestWeightsForExercises(exerciseIds),
    getBestDurationsForExercises(exerciseIds),
    getExercises(),
  ]);

  return (
    <ActiveSession
      session={session}
      templateExercises={templateExercises}
      lastSets={lastSets}
      bestWeights={bestWeights}
      bestDurations={bestDurations}
      allExercises={allExercises}
    />
  );
}
