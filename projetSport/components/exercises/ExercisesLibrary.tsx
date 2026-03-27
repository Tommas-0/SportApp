"use client";

import { useState } from "react";
import Link from "next/link";
import { createExerciseAction, deleteExerciseAction, getExerciseUsageAction } from "@/app/actions/exercises";
import { TRACKING_MODE_LABEL, resolveTrackingMode } from "@/lib/exercise-validation";
import type { Exercise, ExerciseCategory, MuscleGroup, TrackingMode } from "@/types";

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: "chest",     label: "Pectoraux" },
  { value: "back",      label: "Dos" },
  { value: "shoulders", label: "Épaules" },
  { value: "arms",      label: "Bras" },
  { value: "legs",      label: "Jambes" },
  { value: "glutes",    label: "Fessiers" },
  { value: "core",      label: "Abdos" },
  { value: "cardio",    label: "Cardio" },
  { value: "full_body", label: "Full body" },
  { value: "other",     label: "Autre" },
];

const MUSCLE_LABEL: Record<MuscleGroup, string> = Object.fromEntries(
  MUSCLE_GROUPS.map((g) => [g.value, g.label])
) as Record<MuscleGroup, string>;

/** Dérive la category Supabase depuis le muscle_group choisi. */
function categoryFromMuscle(muscle: MuscleGroup): ExerciseCategory {
  if (muscle === "cardio")   return "cardio";
  return "strength";
}

const TRACKING_MODES: { value: TrackingMode; label: string; desc: string }[] = [
  { value: "reps",          label: "Répétitions", desc: "Poids + reps (musculation / PDC)" },
  { value: "duration",      label: "Durée",       desc: "Gainage, cardio, étirements"     },
  { value: "reps_duration", label: "Hybride",     desc: "Reps + durée (circuits, AMRAP)"  },
];

const TRACKING_MODE_BADGE: Record<TrackingMode, { label: string; cls: string }> = {
  reps:          { label: "Reps",   cls: "text-blue-400/80 bg-blue-500/10"   },
  duration:      { label: "⏱",     cls: "text-purple-400/80 bg-purple-500/10" },
  reps_duration: { label: "⏱+Rep", cls: "text-teal-400/80 bg-teal-500/10"   },
};

const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors";

export function ExercisesLibrary({ initial }: { initial: Exercise[] }) {
  const [exercises,    setExercises]    = useState<Exercise[]>(initial);
  const [showForm,     setShowForm]     = useState(false);
  const [name,         setName]         = useState("");
  const [muscle,       setMuscle]       = useState<MuscleGroup>("other");
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("reps");
  const [creating,     setCreating]     = useState(false);
  const [deletingId,      setDeletingId]      = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmUsage,    setConfirmUsage]    = useState<{ templateCount: number; setCount: number } | null>(null);
  const [forceDeleting,   setForceDeleting]   = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [filter,          setFilter]          = useState<MuscleGroup | "all">("all");

  function handleMuscleChange(m: MuscleGroup) {
    setMuscle(m);
    // Suggère automatiquement le mode durée pour les exercices cardio
    if (m === "cardio") setTrackingMode("duration");
    else if (trackingMode === "duration") setTrackingMode("reps");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const duplicate = exercises.some((ex) => ex.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicate) { setError("Un exercice avec ce nom existe déjà."); return; }
    setCreating(true); setError(null);
    const result = await createExerciseAction({
      name:          name.trim(),
      muscle_group:  muscle,
      category:      categoryFromMuscle(muscle),
      tracking_mode: trackingMode,
      notes:         null,
    });
    setCreating(false);
    if (!result.success) { setError(result.error); return; }
    setExercises((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
    setName(""); setTrackingMode("reps"); setShowForm(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const usage = await getExerciseUsageAction(id);
    setDeletingId(null);
    if (usage.success && (usage.data.templateCount > 0 || usage.data.setCount > 0)) {
      setConfirmDeleteId(id);
      setConfirmUsage(usage.data);
      return;
    }
    const result = await deleteExerciseAction(id);
    if (!result.success) { setError(result.error); return; }
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleForceDelete() {
    if (!confirmDeleteId) return;
    setForceDeleting(true);
    const result = await deleteExerciseAction(confirmDeleteId);
    setForceDeleting(false);
    setConfirmDeleteId(null);
    setConfirmUsage(null);
    if (!result.success) { setError(result.error); return; }
    setExercises((prev) => prev.filter((e) => e.id !== confirmDeleteId));
  }

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const key = ex.muscle_group ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  const filteredGroups  = filter === "all" ? grouped : { [filter]: grouped[filter] ?? [] };
  const musclesWithData = MUSCLE_GROUPS.filter((g) => grouped[g.value]?.length > 0);

  return (
    <div className="space-y-4">
      {/* Dialog de confirmation de suppression forcée */}
      {confirmDeleteId && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 space-y-3">
          <p className="text-sm text-white font-medium">Supprimer cet exercice ?</p>
          <p className="text-xs text-zinc-400">
            {[
              confirmUsage?.templateCount ? `${confirmUsage.templateCount} programme${confirmUsage.templateCount > 1 ? "s" : ""}` : "",
              confirmUsage?.setCount      ? `${confirmUsage.setCount} série${confirmUsage.setCount > 1 ? "s" : ""} enregistrée${confirmUsage.setCount > 1 ? "s" : ""}` : "",
            ].filter(Boolean).join(" et ")} seront également supprimé{(confirmUsage?.setCount ?? 0) + (confirmUsage?.templateCount ?? 0) > 1 ? "s" : ""}.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleForceDelete}
              disabled={forceDeleting}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {forceDeleting ? "Suppression…" : "Supprimer quand même"}
            </button>
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="px-4 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-2 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Erreur globale */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
        </p>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filter === "all" ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:text-white"
          }`}
        >
          Tous
        </button>
        {musclesWithData.map((g) => (
          <button
            key={g.value}
            onClick={() => setFilter(g.value)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === g.value ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:text-white"
            }`}
          >
            {g.label} <span className="text-zinc-500">({grouped[g.value]?.length ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Formulaire création */}
      {showForm ? (
        <form onSubmit={handleCreate} className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Nouvel exercice</p>

          <input
            className={inputCls}
            placeholder="Nom de l'exercice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <select
            className={`${inputCls} text-zinc-300`}
            value={muscle}
            onChange={(e) => handleMuscleChange(e.target.value as MuscleGroup)}
          >
            {MUSCLE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>

          {/* Sélecteur du mode de suivi */}
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">Mode de suivi</p>
            <div className="flex flex-col gap-1.5">
              {TRACKING_MODES.map((tm) => (
                <button
                  key={tm.value}
                  type="button"
                  onClick={() => setTrackingMode(tm.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    trackingMode === tm.value
                      ? "border-orange-600 bg-orange-600/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                    trackingMode === tm.value ? "border-blue-500 bg-blue-500" : "border-zinc-600"
                  }`} />
                  <div>
                    <p className={`text-xs font-medium ${trackingMode === tm.value ? "text-blue-300" : "text-zinc-300"}`}>
                      {tm.label}
                    </p>
                    <p className="text-[10px] text-zinc-600">{tm.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
            >
              {creating ? "…" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); setName(""); setTrackingMode("reps"); }}
              className="px-4 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-2 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          + Nouvel exercice
        </button>
      )}

      {/* Liste groupée */}
      {exercises.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-12">Aucun exercice pour l&apos;instant.</p>
      ) : (
        <div className="space-y-4">
          {MUSCLE_GROUPS.filter((g) => filteredGroups[g.value]?.length).map((g) => (
            <div key={g.value}>
              <h2 className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">{g.label}</h2>
              <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
                {filteredGroups[g.value]!.map((ex) => {
                  const badge = TRACKING_MODE_BADGE[resolveTrackingMode(ex)];
                  return (
                    <div key={ex.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{ex.name}</p>
                        <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <Link
                          href={`/progress?exercise=${ex.id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Progression →
                        </Link>
                        <button
                          onClick={() => handleDelete(ex.id)}
                          disabled={deletingId === ex.id}
                          className="text-xs text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {deletingId === ex.id ? "…" : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
