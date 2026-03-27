import { getSessionById } from "@/lib/db/sessions";
import { getBestWeightsBeforeSession } from "@/lib/db/sets";
import { getCardioHistory } from "@/lib/db/cardio-segments";
import Link from "next/link";
import { DeleteSessionButton } from "@/components/sessions/DeleteSessionButton";
import { notFound } from "next/navigation";
import { getBodyStats } from "@/lib/db/body-stats";
import { calculateSetKcal, calculateSessionKcal } from "@/lib/utils/fitness";
import { CardioProgressChart } from "@/components/cardio/CardioProgressChart";

const MUSCLE_LABEL: Record<string, string> = {
  chest:"Pectoraux", back:"Dos", shoulders:"Épaules", arms:"Bras",
  legs:"Jambes", glutes:"Fessiers", core:"Abdos", cardio:"Cardio",
  full_body:"Full body", other:"Autre",
};

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

  const sets = session.workout_sets ?? [];

  const byExercise = sets.reduce<Record<string, typeof sets>>((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = [];
    acc[s.exercise_id].push(s);
    return acc;
  }, {});

  const exerciseIds  = Object.keys(byExercise);
  const cardioIds    = exerciseIds.filter((id) => {
    const ex = byExercise[id][0]?.exercise;
    return ex?.category === "cardio" || ex?.tracking_mode === "duration" || ex?.muscle_group === "cardio";
  });

  const [allTimeBests, bodyStats, ...cardioHistories] = await Promise.all([
    getBestWeightsBeforeSession(exerciseIds, session.id),
    getBodyStats(),
    ...cardioIds.map((id) => getCardioHistory(id, 15)),
  ]);
  const cardioHistoryMap = Object.fromEntries(
    cardioIds.map((id, i) => [id, cardioHistories[i]])
  );

  const bodyweightKg = Number(bodyStats.find((s) => s.weight_kg != null)?.weight_kg ?? 75);

  const workingSets = sets.filter((s) => !s.is_warmup);
  const totalVolume = workingSets.reduce((sum, s) => {
    if (!s.reps || !s.weight_kg) return sum;
    return sum + Number(s.reps) * Number(s.weight_kg);
  }, 0);

  const sessionKcal = calculateSessionKcal(
    workingSets.map((s) => ({
      reps:             s.reps,
      weight_kg:        s.weight_kg,
      duration_seconds: (s as any).duration_seconds,
      tracking_mode:    s.exercise?.tracking_mode,
      muscle_group:     s.exercise?.muscle_group,
      category:         s.exercise?.category,
      is_warmup:        false,
    })),
    bodyweightKg
  );

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDuration(started: string, ended: string | null) {
    if (!ended) return "En cours";
    const min = Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 60000);
    const h   = Math.floor(min / 60);
    return h > 0 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${min} min`;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-4 max-w-lg mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/sessions" className="text-zinc-400 hover:text-white transition-colors shrink-0">←</Link>
            <h1 className="text-lg font-semibold text-white truncate">{session.name}</h1>
          </div>
          <DeleteSessionButton id={session.id} />
        </div>

        {/* Méta */}
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Date</span>
            <span className="text-zinc-300 capitalize">{formatDate(session.started_at)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Durée</span>
            <span className="text-zinc-300">{formatDuration(session.started_at, session.ended_at)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Séries travaillées</span>
            <span className="text-zinc-300">{workingSets.length}</span>
          </div>
          {totalVolume > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Volume total</span>
              <span className="text-white font-semibold">{Math.round(totalVolume).toLocaleString("fr-FR")} kg</span>
            </div>
          )}
          {sessionKcal > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Kcal dépensées</span>
              <span className="text-orange-400 font-semibold">{Math.round(sessionKcal).toLocaleString("fr-FR")} kcal</span>
            </div>
          )}
          {session.notes && (
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-400">{session.notes}</p>
            </div>
          )}
        </div>

        {/* Séries par exercice */}
        {sets.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-8">Aucune série enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {exerciseIds.map((exerciseId) => {
              const exerciseSets = byExercise[exerciseId];
              const exercise     = exerciseSets[0].exercise;
              const working      = exerciseSets.filter((s) => !s.is_warmup);
              const warmups      = exerciseSets.filter((s) => s.is_warmup);

              const bestWeight = Math.max(0, ...working.map((s) => s.weight_kg ?? 0));
              const exVolume   = working.reduce((sum, s) => {
                if (!s.reps || !s.weight_kg) return sum;
                return sum + Number(s.reps) * Number(s.weight_kg);
              }, 0);
              const totalReps = working.reduce((sum, s) => sum + (s.reps ?? 0), 0);
              const prevBest  = allTimeBests[exerciseId] ?? 0;
              const isPR      = bestWeight > 0 && bestWeight > prevBest;
              const exKcal    = working.reduce((sum, s) => sum + calculateSetKcal({
                reps:             s.reps,
                weight_kg:        s.weight_kg,
                duration_seconds: (s as any).duration_seconds,
                tracking_mode:    s.exercise?.tracking_mode,
                muscle_group:     s.exercise?.muscle_group,
                category:         s.exercise?.category,
                is_warmup:        false,
              }, bodyweightKg), 0);

              return (
                <div key={exerciseId} className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden">
                  {/* En-tête exercice */}
                  <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{exercise?.name ?? "Exercice"}</p>
                      {exercise?.muscle_group && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {MUSCLE_LABEL[exercise.muscle_group] ?? exercise.muscle_group}
                        </p>
                      )}
                    </div>
                    {isPR && (
                      <span className="bg-yellow-500/15 text-yellow-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-yellow-500/25">
                        🏆 PR
                      </span>
                    )}
                  </div>

                  {/* Séries */}
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-3 text-[10px] text-zinc-600 uppercase tracking-wide mb-2">
                      <span>Série</span>
                      <span className="text-center">Reps</span>
                      <span className="text-right">Poids</span>
                    </div>

                    {warmups.map((s) => (
                      <div key={s.id} className="grid grid-cols-3 py-1.5 border-t border-zinc-800/50 text-xs">
                        <span className="text-zinc-700">#{s.set_number} éch.</span>
                        <span className="text-zinc-700 text-center">{s.reps ?? "—"}</span>
                        <span className="text-zinc-700 text-right">{s.weight_kg ? `${s.weight_kg} kg` : "—"}</span>
                      </div>
                    ))}

                    {working.map((s) => {
                      const isSetPR = s.weight_kg != null && Number(s.weight_kg) > prevBest;
                      return (
                        <div key={s.id} className="grid grid-cols-3 py-1.5 border-t border-zinc-800/50 text-xs">
                          <span className={isSetPR ? "text-yellow-400" : "text-zinc-500"}>#{s.set_number}</span>
                          <span className={`text-center ${isSetPR ? "text-yellow-400" : "text-white"}`}>{s.reps ?? "—"}</span>
                          <span className={`text-right font-medium ${isSetPR ? "text-yellow-400" : "text-white"}`}>
                            {s.weight_kg ? `${s.weight_kg} kg` : "—"}
                          </span>
                        </div>
                      );
                    })}

                    {working.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-600">
                        <span>{working.length} série{working.length > 1 ? "s" : ""} · {totalReps} reps</span>
                        <div className="flex gap-3">
                          {bestWeight > 0 && <span>Max {bestWeight} kg</span>}
                          {exVolume > 0 && <span>{Math.round(exVolume).toLocaleString("fr-FR")} kg vol.</span>}
                          {exKcal > 0 && <span className="text-orange-500">{Math.round(exKcal)} kcal</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart progression cardio */}
                  {cardioHistoryMap[exerciseId]?.length > 1 && (
                    <div className="px-3 pb-3">
                      <CardioProgressChart
                        data={cardioHistoryMap[exerciseId]}
                        exerciseName={exercise?.name ?? "Cardio"}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
