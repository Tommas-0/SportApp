import { Suspense } from "react";
import { getWeightHistory, getExerciseProgress, getSessionVolumes, getBodyCompositionHistory } from "@/lib/db/stats";
import { getExercises } from "@/lib/db/exercises";
import { getFitnessGoal } from "@/lib/db/user-settings";
import { getCardioHistory } from "@/lib/db/cardio-segments";
import { WeightChart } from "@/components/charts/WeightChart";
import { WeightAdvicePanel } from "@/components/charts/WeightAdvicePanel";
import { ExerciseProgressChart } from "@/components/charts/ExerciseProgressChart";
import { SessionVolumeChart } from "@/components/charts/SessionVolumeChart";
import { ExerciseSelector } from "@/components/charts/ExerciseSelector";
import { BodyCompositionChart } from "@/components/charts/BodyCompositionChart";
import { GoalSelector } from "@/components/charts/GoalSelector";
import { CardioProgressChart } from "@/components/cardio/CardioProgressChart";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const { exercise: exerciseId } = await searchParams;

  const [weightHistory, sessionVolumes, exercises, bodyComposition, fitnessGoal] = await Promise.all([
    getWeightHistory(),
    getSessionVolumes(15),
    getExercises(),
    getBodyCompositionHistory(),
    getFitnessGoal(),
  ]);

  const exerciseProgress = exerciseId
    ? await getExerciseProgress(exerciseId)
    : [];

  const selectedExercise = exercises.find((e) => e.id === exerciseId) ?? null;
  const isCardio = selectedExercise?.category === "cardio" || selectedExercise?.tracking_mode === "duration";

  const cardioHistory = isCardio && exerciseId
    ? await getCardioHistory(exerciseId, 20)
    : [];

  return (
    <>
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
    </div>
    <div className="relative z-10 space-y-5 max-w-lg mx-auto pb-12">
      <h1 className="text-lg font-semibold text-white">Progression</h1>

      {/* Volume par séance */}
      <ChartCard title="Volume par séance" subtitle="Σ reps × poids · 15 dernières séances">
        <Suspense fallback={<ChartSkeleton />}>
          <SessionVolumeChart data={sessionVolumes} />
        </Suspense>
      </ChartCard>

      {/* Progression exercice */}
      <ChartCard
        title="Progression exercice"
        subtitle={selectedExercise?.name ?? "Sélectionne un exercice"}
      >
        <div className="mb-4">
          <Suspense fallback={null}>
            <ExerciseSelector
              exercises={exercises}
              selectedId={exerciseId ?? null}
            />
          </Suspense>
        </div>
        {exerciseId && isCardio ? (
          <CardioProgressChart
            data={cardioHistory}
            exerciseName={selectedExercise?.name ?? ""}
          />
        ) : exerciseId ? (
          <ExerciseProgressChart
            data={exerciseProgress}
            exerciseName={selectedExercise?.name ?? ""}
          />
        ) : (
          <div className="h-[260px] flex items-center justify-center">
            <p className="text-zinc-600 text-sm">
              Choisis un exercice pour voir ta progression.
            </p>
          </div>
        )}
      </ChartCard>

      {/* Composition corporelle */}
      <ChartCard title="Composition corporelle" subtitle="Masse grasse, musculaire, osseuse, hydratation">
        <Suspense fallback={<ChartSkeleton />}>
          <BodyCompositionChart data={bodyComposition} />
        </Suspense>
      </ChartCard>

      {/* Évolution poids + conseils */}
      <ChartCard title="Poids corporel" subtitle="Évolution dans le temps">
        <Suspense fallback={<ChartSkeleton />}>
          <WeightChart data={weightHistory} />
        </Suspense>
        <div className="mt-5 pt-5 border-t border-zinc-800 space-y-5">
          <GoalSelector current={fitnessGoal} />
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Analyse & conseils</p>
            <WeightAdvicePanel data={weightHistory} goal={fitnessGoal} />
          </div>
        </div>
      </ChartCard>
    </div>
    </>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[220px] bg-zinc-800 rounded-xl animate-pulse" />
  );
}
