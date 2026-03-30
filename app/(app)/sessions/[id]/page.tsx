import { getSessionById } from "@/lib/db/sessions";
import { getBestWeightsBeforeSession } from "@/lib/db/sets";
import { getCardioHistory } from "@/lib/db/cardio-segments";
import { notFound } from "next/navigation";
import { getBodyStats } from "@/lib/db/body-stats";
import { getExercises, getGlobalExercises } from "@/lib/db/exercises";
import { SessionDetail } from "@/components/sessions/SessionDetail";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let session;
  try {
    session = await getSessionById(id);
  } catch {
    notFound();
  }

  const sets        = session.workout_sets ?? [];
  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
  const cardioIds   = exerciseIds.filter((eid) => {
    const ex = sets.find((s) => s.exercise_id === eid)?.exercise;
    return ex?.category === "cardio" || ex?.tracking_mode === "duration" || ex?.muscle_group === "cardio";
  });

  const [allTimeBests, bodyStats, exercises, globalExercises] = await Promise.all([
    getBestWeightsBeforeSession(exerciseIds, session.id),
    getBodyStats(),
    getExercises(),
    getGlobalExercises().catch(() => []),
  ]);

  const cardioHistories = await Promise.all(
    cardioIds.map((eid) => getCardioHistory(eid, 15))
  );

  const cardioHistoryMap = Object.fromEntries(
    cardioIds.map((eid, i) => [eid, cardioHistories[i]])
  );

  const bodyweightKg = Number(
    bodyStats.find((s) => s.weight_kg != null)?.weight_kg ?? 75
  );

  return (
    <SessionDetail
      session={session}
      allTimeBests={allTimeBests}
      bodyweightKg={bodyweightKg}
      cardioHistoryMap={cardioHistoryMap}
      exercises={exercises}
      globalExercises={globalExercises}
    />
  );
}
