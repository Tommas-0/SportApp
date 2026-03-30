"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeleteSessionButton } from "@/components/sessions/DeleteSessionButton";
import { CardioProgressChart } from "@/components/cardio/CardioProgressChart";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { updateSessionAction } from "@/app/actions/sessions";
import { updateSetAction, deleteSetAction, logSetAction } from "@/app/actions/sets";
import { createExerciseAction } from "@/app/actions/exercises";
import { calculateSetKcal, calculateSessionKcal } from "@/lib/utils/fitness";
import type { WorkoutSession, WorkoutSet, Exercise, GlobalExercise } from "@/types";

const MUSCLE_LABEL: Record<string, string> = {
  chest: "Pectoraux", back: "Dos", shoulders: "Épaules", arms: "Bras",
  legs: "Jambes", glutes: "Fessiers", core: "Abdos", cardio: "Cardio", other: "Autre",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(started: string, ended: string | null) {
  if (!ended) return "En cours";
  const min = Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 60000);
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${min} min`;
}

type EditingSet = {
  id: string;
  reps: string;
  weight_kg: string;
  duration_min: string;
};

type CardioEntry = { date: string; duration_seconds: number };

const inputCls =
  "w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500";

type AddPhase = "closed" | "picking" | "inputting";

type AddInputs = { reps: string; weight: string; duration: string };

export function SessionDetail({
  session: initialSession,
  allTimeBests,
  bodyweightKg,
  cardioHistoryMap,
  exercises      = [],
  globalExercises = [],
}: {
  session: WorkoutSession;
  allTimeBests: Record<string, number>;
  bodyweightKg: number;
  cardioHistoryMap: Record<string, CardioEntry[]>;
  exercises?:       Exercise[];
  globalExercises?: GlobalExercise[];
}) {
  const router = useRouter();

  const [sets,       setSets]       = useState<WorkoutSet[]>(initialSession.workout_sets ?? []);
  const [name,       setName]       = useState(initialSession.name);
  const [notes,      setNotes]      = useState(initialSession.notes ?? "");
  const [editMeta,   setEditMeta]   = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [editSet,    setEditSet]    = useState<EditingSet | null>(null);
  const [savingSet,  setSavingSet]  = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [metaError,  setMetaError]  = useState<string | null>(null);
  const [setError,   setSetError]   = useState<string | null>(null);

  // ── Ajouter un exercice ──────────────────────────────────────
  const [addPhase,    setAddPhase]    = useState<AddPhase>("closed");
  const [addEx,       setAddEx]       = useState<Exercise | null>(null);
  const [addInputs,   setAddInputs]   = useState<AddInputs>({ reps: "", weight: "", duration: "" });
  const [addLoading,  setAddLoading]  = useState(false);
  const [addError,    setAddError]    = useState<string | null>(null);
  const [localExercises, setLocalExercises] = useState<Exercise[]>(exercises);

  // Exercices du picker : exclure ceux déjà dans la séance (car ils sont déjà visibles)
  const pickerUserExercises = useMemo(
    () => localExercises.filter((ex) => !sets.some((s) => s.exercise_id === ex.id)),
    [localExercises, sets]
  );
  const pickerGlobalExercises = useMemo(
    () => globalExercises.filter(
      (g) => !localExercises.some((e) => e.name.toLowerCase() === g.name.toLowerCase())
    ),
    [globalExercises, localExercises]
  );

  function nextSetNumber(exerciseId: string): number {
    return sets.filter((s) => s.exercise_id === exerciseId).length + 1;
  }

  function handleExPicked(ex: Exercise) {
    setAddEx(ex);
    setAddPhase("inputting");
    setAddInputs({ reps: "", weight: "", duration: "" });
    setAddError(null);
  }

  async function handleImportAndSelect(global: GlobalExercise): Promise<Exercise | null> {
    const res = await createExerciseAction({
      name:          global.name,
      muscle_group:  global.muscle_group,
      category:      global.category,
      tracking_mode: global.tracking_mode,
      notes:         null,
    });
    if (!res.success) return null;
    setLocalExercises((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    return res.data;
  }

  async function handleAddSet() {
    if (!addEx) return;
    setAddLoading(true);
    setAddError(null);

    const reps             = addInputs.reps     ? parseInt(addInputs.reps)                       : undefined;
    const weight_kg        = addInputs.weight   ? parseFloat(addInputs.weight)                   : undefined;
    const duration_seconds = addInputs.duration ? Math.round(parseFloat(addInputs.duration) * 60) : undefined;

    const res = await logSetAction({
      session_id:       initialSession.id,
      exercise_id:      addEx.id,
      set_number:       nextSetNumber(addEx.id),
      tracking_mode:    addEx.tracking_mode ?? "reps",
      reps,
      weight_kg,
      duration_seconds,
    });

    setAddLoading(false);
    if (!res.success) { setAddError(res.error); return; }

    // Injecter l'objet exercise dans le set retourné
    const newSet: WorkoutSet = { ...res.data, exercise: addEx };
    setSets((prev) => [...prev, newSet]);
    setAddInputs({ reps: "", weight: "", duration: "" });
    // Reste en mode "inputting" pour pouvoir ajouter une autre série
  }

  // ── Groupement par exercice ────────────────────────────────
  const byExercise = sets.reduce<Record<string, WorkoutSet[]>>((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = [];
    acc[s.exercise_id].push(s);
    return acc;
  }, {});
  const exerciseIds = Object.keys(byExercise);

  // ── Stats globales (recalculées live) ──────────────────────
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

  // ── Handlers ──────────────────────────────────────────────
  async function handleSaveMeta() {
    setSavingMeta(true);
    setMetaError(null);
    const res = await updateSessionAction(initialSession.id, {
      name:  name.trim() || initialSession.name,
      notes: notes.trim() || null,
    });
    setSavingMeta(false);
    if (!res.success) { setMetaError(res.error); return; }
    setEditMeta(false);
    router.refresh();
  }

  function cancelMeta() {
    setEditMeta(false);
    setName(initialSession.name);
    setNotes(initialSession.notes ?? "");
    setMetaError(null);
  }

  function startEditSet(s: WorkoutSet) {
    setSetError(null);
    setEditSet({
      id:           s.id,
      reps:         s.reps          != null ? String(s.reps)                                        : "",
      weight_kg:    s.weight_kg     != null ? String(s.weight_kg)                                   : "",
      duration_min: s.duration_seconds != null
        ? String(Math.round((s.duration_seconds / 60) * 10) / 10)
        : "",
    });
  }

  async function handleSaveSet() {
    if (!editSet) return;
    setSavingSet(true);
    setSetError(null);
    const res = await updateSetAction(
      editSet.id,
      {
        reps:             editSet.reps         ? parseInt(editSet.reps)                                  : null,
        weight_kg:        editSet.weight_kg    ? parseFloat(editSet.weight_kg)                           : null,
        duration_seconds: editSet.duration_min ? Math.round(parseFloat(editSet.duration_min) * 60)       : null,
      },
      initialSession.id
    );
    setSavingSet(false);
    if (!res.success) { setSetError(res.error); return; }
    setSets((prev) => prev.map((s) => (s.id === editSet.id ? res.data : s)));
    setEditSet(null);
  }

  async function handleDeleteSet(setId: string) {
    setDeletingId(setId);
    await deleteSetAction(setId, initialSession.id);
    setSets((prev) => prev.filter((s) => s.id !== setId));
    setDeletingId(null);
    setConfirmDel(null);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-4 max-w-lg mx-auto pb-12">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href="/sessions" className="text-zinc-400 hover:text-white transition-colors shrink-0">←</Link>
            {editMeta ? (
              <input
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1 text-base font-semibold text-white focus:outline-none focus:border-orange-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            ) : (
              <h1 className="text-lg font-semibold text-white truncate">{name}</h1>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editMeta ? (
              <>
                <button
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-40 transition-colors"
                >
                  {savingMeta ? "…" : "✓ Sauvegarder"}
                </button>
                <button
                  onClick={cancelMeta}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMeta(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Modifier
                </button>
                <DeleteSessionButton id={initialSession.id} />
              </>
            )}
          </div>
        </div>

        {/* ── Méta ── */}
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Date</span>
            <span className="text-zinc-300 capitalize">{formatDate(initialSession.started_at)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Durée</span>
            <span className="text-zinc-300">{formatDuration(initialSession.started_at, initialSession.ended_at)}</span>
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

          {/* Notes */}
          <div className="pt-2 border-t border-zinc-800">
            {editMeta ? (
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Notes</p>
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                  rows={2}
                  placeholder="Notes de séance…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {metaError && <p className="text-xs text-red-400">{metaError}</p>}
              </div>
            ) : (
              notes
                ? <p className="text-xs text-zinc-400">{notes}</p>
                : <p className="text-xs text-zinc-600 italic">Aucune note — clique sur Modifier pour en ajouter</p>
            )}
          </div>
        </div>

        {/* ── Séries par exercice ── */}
        {sets.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">Aucune série enregistrée.</p>
        )}
        {sets.length > 0 && (
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
              const totalReps  = working.reduce((sum, s) => sum + (s.reps ?? 0), 0);
              const prevBest   = allTimeBests[exerciseId] ?? 0;
              const isPR       = bestWeight > 0 && bestWeight > prevBest;
              const exKcal     = working.reduce((sum, s) => sum + calculateSetKcal({
                reps:             s.reps,
                weight_kg:        s.weight_kg,
                duration_seconds: (s as any).duration_seconds,
                tracking_mode:    s.exercise?.tracking_mode,
                muscle_group:     s.exercise?.muscle_group,
                category:         s.exercise?.category,
                is_warmup:        false,
              }, bodyweightKg), 0);

              const mode     = exercise?.tracking_mode ?? "reps";
              const isDur    = mode === "duration";
              const allSets  = [...warmups, ...working];

              return (
                <div key={exerciseId} className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden">

                  {/* En-tête */}
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
                      <span className="text-center">{isDur ? "Durée" : "Reps"}</span>
                      <span className="text-right">{isDur ? "" : "Poids"}</span>
                    </div>

                    {allSets.map((s) => {
                      const isWarmup      = s.is_warmup;
                      const isSetPR       = !isWarmup && s.weight_kg != null && Number(s.weight_kg) > prevBest;
                      const isEditingThis = editSet?.id === s.id;
                      const isConfirming  = confirmDel === s.id;

                      if (isConfirming) {
                        return (
                          <div key={s.id} className="py-2 border-t border-zinc-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-400 flex-1">Supprimer cette série ?</span>
                              <button
                                onClick={() => handleDeleteSet(s.id)}
                                disabled={deletingId === s.id}
                                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded disabled:opacity-50"
                              >
                                {deletingId === s.id ? "…" : "Oui"}
                              </button>
                              <button
                                onClick={() => setConfirmDel(null)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
                              >
                                Non
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (isEditingThis) {
                        return (
                          <div key={s.id} className="py-2 border-t border-zinc-800/50 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {!isDur && (
                                <input
                                  type="number" placeholder="Poids kg" min="0" step="0.5"
                                  value={editSet.weight_kg}
                                  onChange={(e) => setEditSet((p) => p ? { ...p, weight_kg: e.target.value } : p)}
                                  className={inputCls}
                                />
                              )}
                              {mode !== "duration" && (
                                <input
                                  type="number" placeholder="Reps" min="1"
                                  value={editSet.reps}
                                  onChange={(e) => setEditSet((p) => p ? { ...p, reps: e.target.value } : p)}
                                  className={inputCls}
                                />
                              )}
                              {(isDur || mode === "reps_duration") && (
                                <input
                                  type="number" placeholder="Durée (min)" min="0" step="0.5"
                                  value={editSet.duration_min}
                                  onChange={(e) => setEditSet((p) => p ? { ...p, duration_min: e.target.value } : p)}
                                  className={`${inputCls} ${isDur ? "col-span-2" : ""}`}
                                />
                              )}
                            </div>
                            {setError && <p className="text-xs text-red-400">{setError}</p>}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveSet}
                                disabled={savingSet}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs rounded-lg py-1.5 transition-colors"
                              >
                                {savingSet ? "…" : "Sauvegarder"}
                              </button>
                              <button
                                onClick={() => { setEditSet(null); setSetError(null); }}
                                className="px-3 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg py-1.5 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={s.id}
                          className="grid grid-cols-3 py-1.5 border-t border-zinc-800/50 text-xs group cursor-pointer hover:bg-zinc-800/30 rounded transition-colors"
                          onClick={() => startEditSet(s)}
                        >
                          <span className={isWarmup ? "text-zinc-700" : isSetPR ? "text-yellow-400" : "text-zinc-500"}>
                            #{s.set_number}{isWarmup ? " éch." : ""}
                          </span>
                          <span className={`text-center ${isWarmup ? "text-zinc-700" : isSetPR ? "text-yellow-400" : "text-white"}`}>
                            {isDur
                              ? (s.duration_seconds ? `${Math.round((s.duration_seconds / 60) * 10) / 10} min` : "—")
                              : (s.reps ?? "—")}
                          </span>
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-medium ${isWarmup ? "text-zinc-700" : isSetPR ? "text-yellow-400" : "text-white"}`}>
                              {isDur ? "" : (s.weight_kg ? `${s.weight_kg} kg` : "—")}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDel(s.id); setEditSet(null); }}
                              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-[10px] leading-none"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {working.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-600">
                        <span>{working.length} série{working.length > 1 ? "s" : ""} · {totalReps} reps</span>
                        <div className="flex gap-3">
                          {bestWeight > 0  && <span>Max {bestWeight} kg</span>}
                          {exVolume > 0    && <span>{Math.round(exVolume).toLocaleString("fr-FR")} kg vol.</span>}
                          {exKcal > 0      && <span className="text-orange-500">{Math.round(exKcal)} kcal</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart cardio */}
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

        {/* ── Ajouter un exercice ── */}
        {addPhase === "closed" && (
          <button
            onClick={() => setAddPhase("picking")}
            className="w-full border border-dashed border-zinc-700 hover:border-orange-500 rounded-xl py-3 text-xs text-zinc-500 hover:text-orange-400 transition-colors"
          >
            + Ajouter un exercice
          </button>
        )}

        {/* Formulaire de saisie de série */}
        {addPhase === "inputting" && addEx && (
          <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{addEx.name}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Série #{nextSetNumber(addEx.id)} · cliquer Valider pour enregistrer
                </p>
              </div>
              <button
                onClick={() => { setAddPhase("closed"); setAddEx(null); setAddError(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {addEx.tracking_mode !== "duration" && (
                <>
                  <input
                    type="number" placeholder="Poids kg" min="0" step="0.5"
                    value={addInputs.weight}
                    onChange={(e) => setAddInputs((p) => ({ ...p, weight: e.target.value }))}
                    className={inputCls}
                    autoFocus
                  />
                  <input
                    type="number" placeholder="Reps" min="1"
                    value={addInputs.reps}
                    onChange={(e) => setAddInputs((p) => ({ ...p, reps: e.target.value }))}
                    className={inputCls}
                  />
                </>
              )}
              {(addEx.tracking_mode === "duration" || addEx.tracking_mode === "reps_duration") && (
                <input
                  type="number" placeholder="Durée (min)" min="0" step="0.5"
                  value={addInputs.duration}
                  onChange={(e) => setAddInputs((p) => ({ ...p, duration: e.target.value }))}
                  className={`${inputCls} ${addEx.tracking_mode === "duration" ? "col-span-2" : ""}`}
                  autoFocus={addEx.tracking_mode === "duration"}
                />
              )}
            </div>

            {addError && <p className="text-xs text-red-400">{addError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleAddSet}
                disabled={addLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
              >
                {addLoading ? "…" : "Valider la série"}
              </button>
              <button
                onClick={() => setAddPhase("picking")}
                className="px-3 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg py-2 transition-colors"
              >
                Autre exercice
              </button>
            </div>
          </div>
        )}

        {/* ExercisePicker (full-screen overlay) */}
        {addPhase === "picking" && (
          <ExercisePicker
            exercises={pickerUserExercises}
            globalExercises={pickerGlobalExercises}
            onSelect={handleExPicked}
            onImportAndSelect={handleImportAndSelect}
            onClose={() => setAddPhase("closed")}
          />
        )}
      </div>
    </>
  );
}
