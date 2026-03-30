"use client";

import { useState } from "react";
import Link from "next/link";
import { createExerciseAction, deleteExerciseAction, getExerciseUsageAction } from "@/app/actions/exercises";
import { conjuguerEtre, frPlural } from "@/lib/utils/fr-plural";
import { resolveTrackingMode } from "@/lib/exercise-validation";
import type { Exercise, GlobalExercise, ExerciseCategory, MuscleGroup, TrackingMode } from "@/types";

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: "chest",     label: "Pectoraux" },
  { value: "back",      label: "Dos" },
  { value: "shoulders", label: "Épaules" },
  { value: "arms",      label: "Bras" },
  { value: "legs",      label: "Jambes" },
  { value: "glutes",    label: "Fessiers" },
  { value: "core",      label: "Abdos" },
  { value: "cardio",    label: "Cardio" },
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

export function ExercisesLibrary({ initial, globalExercises = [] }: { initial: Exercise[]; globalExercises?: GlobalExercise[] }) {
  const [exercises,    setExercises]    = useState<Exercise[]>(initial);
  const [globalTab,       setGlobalTab]       = useState(false);
  const [globalSearch,    setGlobalSearch]    = useState("");
  const [globalFilter,    setGlobalFilter]    = useState<MuscleGroup | "all">("all");
  const [globalSubfilter, setGlobalSubfilter] = useState<string | "all">("all");
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
  const [subFilter,       setSubFilter]       = useState<string | "all">("all");

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

  const musclesWithData = MUSCLE_GROUPS.filter((g) => grouped[g.value]?.length > 0);

  // Sous-groupes disponibles pour le groupe sélectionné (Mes exercices)
  const mySubgroups = (() => {
    if (filter === "all") return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const ex of exercises) {
      if (ex.muscle_group !== filter) continue;
      if (ex.muscle_subgroup) map.set(ex.muscle_subgroup.id, ex.muscle_subgroup);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Filtrage avec sous-groupe
  const filteredGroups = (() => {
    let base = filter === "all" ? exercises : exercises.filter((ex) => ex.muscle_group === filter);
    if (subFilter !== "all") {
      base = base.filter((ex) => ex.muscle_subgroup?.id === subFilter);
    }
    return base.reduce<Record<string, Exercise[]>>((acc, ex) => {
      const key = ex.muscle_group ?? "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    }, {});
  })();

  // Exercices filtrés par recherche seule (pour les compteurs de groupe)
  const globalBySearch = globalExercises.filter(
    (ex) => !globalSearch || ex.name.toLowerCase().includes(globalSearch.toLowerCase())
  );
  // Compteur par groupe (basé sur recherche uniquement)
  const globalCountByGroup = globalBySearch.reduce<Record<string, number>>((acc, ex) => {
    const key = ex.muscle_group ?? "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Sous-groupes disponibles pour le groupe sélectionné (basés sur recherche + groupe)
  const globalBySearchAndGroup = globalBySearch.filter(
    (ex) => globalFilter === "all" || ex.muscle_group === globalFilter
  );
  const globalSubgroups = globalFilter === "all" ? [] : Array.from(
    new Map(
      globalBySearchAndGroup
        .filter((ex) => ex.muscle_subgroup)
        .map((ex) => [ex.muscle_subgroup!.id, ex.muscle_subgroup!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  // Compteur par sous-groupe
  const globalCountBySubgroup = globalBySearchAndGroup.reduce<Record<string, number>>((acc, ex) => {
    if (!ex.muscle_subgroup) return acc;
    acc[ex.muscle_subgroup.id] = (acc[ex.muscle_subgroup.id] ?? 0) + 1;
    return acc;
  }, {});

  // Exercices globaux filtrés par recherche + groupe + sous-groupe
  const filteredGlobal = globalBySearchAndGroup.filter(
    (ex) => globalSubfilter === "all" || ex.muscle_subgroup?.id === globalSubfilter
  );
  const globalGrouped = filteredGlobal.reduce<Record<string, GlobalExercise[]>>((acc, g) => {
    const key = g.muscle_group ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});
  const globalMusclesWithData = MUSCLE_GROUPS.filter(
    (g) => globalCountByGroup[g.value] != null
  );

  async function handleImportGlobal(g: GlobalExercise) {
    const duplicate = exercises.some((e) => e.name.toLowerCase() === g.name.toLowerCase());
    if (duplicate) { setError(`"${g.name}" est déjà dans ta bibliothèque.`); return; }
    const result = await createExerciseAction({
      name:          g.name,
      muscle_group:  g.muscle_group,
      category:      g.category,
      tracking_mode: g.tracking_mode,
      notes:         null,
    });
    if (!result.success) { setError(result.error); return; }
    setExercises((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
    setGlobalTab(false);
  }

  return (
    <div className="space-y-4">
      {/* Dialog de confirmation de suppression forcée */}
      {confirmDeleteId && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 space-y-3">
          <p className="text-sm text-white font-medium">Supprimer cet exercice ?</p>
          <p className="text-xs text-zinc-400">
            {(() => {
              const total = (confirmUsage?.setCount ?? 0) + (confirmUsage?.templateCount ?? 0);
              const parts = [
                confirmUsage?.templateCount ? `${confirmUsage.templateCount} programme${confirmUsage.templateCount > 1 ? "s" : ""}` : "",
                confirmUsage?.setCount      ? `${confirmUsage.setCount} série${confirmUsage.setCount > 1 ? "s" : ""} enregistrée${confirmUsage.setCount > 1 ? "s" : ""}` : "",
              ].filter(Boolean);
              return `${parts.join(" et ")} ${conjuguerEtre(total)} également ${frPlural(total, "supprimé", "supprimés")}.`;
            })()}
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

      {/* Onglets Mes exercices / Bibliothèque */}
      {globalExercises.length > 0 && (
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button
            onClick={() => setGlobalTab(false)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
              !globalTab ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Mes exercices
          </button>
          <button
            onClick={() => setGlobalTab(true)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
              globalTab ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Bibliothèque ({globalExercises.length})
          </button>
        </div>
      )}

      {/* ── TAB : Bibliothèque globale ── */}
      {globalTab && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Rechercher un exercice…"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />

          {/* Filtres — niveau 1 : groupe musculaire */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setGlobalFilter("all"); setGlobalSubfilter("all"); }}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                globalFilter === "all" ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              Tous <span className={globalFilter === "all" ? "text-orange-200" : "text-zinc-500"}>({globalBySearch.length})</span>
            </button>
            {globalMusclesWithData.map((g) => (
              <button
                key={g.value}
                onClick={() => { setGlobalFilter(g.value); setGlobalSubfilter("all"); }}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  globalFilter === g.value ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:text-white"
                }`}
              >
                {g.label} <span className={globalFilter === g.value ? "text-orange-200" : "text-zinc-500"}>({globalCountByGroup[g.value] ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Filtres — niveau 2 : sous-groupe */}
          {globalSubgroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-1 border-l-2 border-zinc-800">
              <button
                onClick={() => setGlobalSubfilter("all")}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  globalSubfilter === "all" ? "bg-zinc-600 border-zinc-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                Tous <span className={globalSubfilter === "all" ? "text-zinc-300" : "text-zinc-600"}>({globalBySearchAndGroup.length})</span>
              </button>
              {globalSubgroups.map((sg) => (
                <button
                  key={sg.id}
                  onClick={() => setGlobalSubfilter(sg.id)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                    globalSubfilter === sg.id ? "bg-zinc-600 border-zinc-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {sg.name} <span className={globalSubfilter === sg.id ? "text-zinc-300" : "text-zinc-600"}>({globalCountBySubgroup[sg.id] ?? 0})</span>
                </button>
              ))}
            </div>
          )}
          {MUSCLE_GROUPS.filter((g) => globalGrouped[g.value]?.length).map((g) => (
            <div key={g.value}>
              <h2 className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">{g.label}</h2>
              <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
                {globalGrouped[g.value]!.map((ex) => {
                  const alreadyOwned = exercises.some((e) => e.name.toLowerCase() === ex.name.toLowerCase());
                  return (
                    <div key={ex.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{ex.name}</p>
                        <span className="text-[10px] text-zinc-600">
                          {ex.muscle_subgroup ? `${ex.muscle_subgroup.name} · ` : ""}
                          {ex.tracking_mode === "duration" ? "⏱ Durée" : ex.tracking_mode === "reps_duration" ? "⏱+Rep" : "Reps"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleImportGlobal(ex)}
                        disabled={alreadyOwned}
                        className="text-xs text-orange-400 hover:text-orange-300 disabled:text-zinc-600 disabled:cursor-default transition-colors shrink-0 ml-3"
                      >
                        {alreadyOwned ? "Déjà ajouté" : "+ Ajouter"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGlobal.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-6">Aucun résultat.</p>
          )}
        </div>
      )}

      {/* ── TAB : Mes exercices (contenu principal) ── */}
      {!globalTab && <>

      {/* Filtres — niveau 1 : groupe musculaire */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setFilter("all"); setSubFilter("all"); }}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filter === "all" ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:text-white"
          }`}
        >
          Tous
        </button>
        {musclesWithData.map((g) => (
          <button
            key={g.value}
            onClick={() => { setFilter(g.value); setSubFilter("all"); }}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === g.value ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:text-white"
            }`}
          >
            {g.label} <span className={filter === g.value ? "text-orange-200" : "text-zinc-500"}>({grouped[g.value]?.length ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Filtres — niveau 2 : sous-groupe (si disponibles) */}
      {mySubgroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1 border-l-2 border-zinc-800">
          <button
            onClick={() => setSubFilter("all")}
            className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
              subFilter === "all" ? "bg-zinc-600 border-zinc-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
            }`}
          >
            Tous
          </button>
          {mySubgroups.map((sg) => (
            <button
              key={sg.id}
              onClick={() => setSubFilter(sg.id)}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                subFilter === sg.id ? "bg-zinc-600 border-zinc-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
              }`}
            >
              {sg.name}
            </button>
          ))}
        </div>
      )}

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

      </> /* fin !globalTab */}
    </div>
  );
}
