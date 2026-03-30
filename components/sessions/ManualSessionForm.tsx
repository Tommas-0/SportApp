"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createManualSessionAction } from "@/app/actions/sessions";
import { createExerciseAction } from "@/app/actions/exercises";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { calculateSetKcal } from "@/lib/utils/fitness";
import type { Exercise, GlobalExercise, TrackingMode, MuscleGroup, ManualSetInput } from "@/types";

// ─── Constantes ───────────────────────────────────────────────

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Pectoraux", back: "Dos", shoulders: "Épaules", arms: "Bras",
  legs: "Jambes", glutes: "Fessiers", core: "Abdos", cardio: "Cardio",
  other: "Autre",
};

// ─── Types locaux ─────────────────────────────────────────────

type SetRow = {
  id:              number;
  reps:            string;
  weight_kg:       string;
  duration_min:    string; // minutes pour l'UI, converti en secondes au submit
  rpe:             string;
  is_warmup:       boolean;
};

type ExerciseEntry = {
  exercise: Exercise;
  sets:     SetRow[];
};

let _id = 0;
function nextId() { return ++_id; }

function emptySet(): SetRow {
  return { id: nextId(), reps: "", weight_kg: "", duration_min: "", rpe: "", is_warmup: false };
}

// ─── Calcul kcal preview ──────────────────────────────────────

function previewKcal(entries: ExerciseEntry[], weightKg: number): number {
  let total = 0;
  for (const { exercise, sets } of entries) {
    for (const s of sets) {
      if (s.is_warmup) continue;
      const reps    = parseInt(s.reps)       || null;
      const weight  = parseFloat(s.weight_kg) || null;
      const dur     = parseFloat(s.duration_min) ? Math.round(parseFloat(s.duration_min) * 60) : null;
      total += calculateSetKcal(
        {
          reps,
          weight_kg:        weight,
          duration_seconds: dur,
          tracking_mode:    exercise.tracking_mode,
          muscle_group:     exercise.muscle_group,
          category:         exercise.category,
          is_warmup:        false,
        },
        weightKg
      );
    }
  }
  return Math.round(total);
}

// ─── Sous-composants ──────────────────────────────────────────

function SetRowInput({
  set,
  mode,
  idx,
  onChange,
  onRemove,
}: {
  set:      SetRow;
  mode:     TrackingMode;
  idx:      number;
  onChange: (updated: SetRow) => void;
  onRemove: () => void;
}) {
  const u = (field: keyof SetRow, val: string | boolean) =>
    onChange({ ...set, [field]: val });

  return (
    <div className={`rounded-xl px-3 py-2.5 space-y-2 ${
      set.is_warmup ? "bg-zinc-800/30" : "bg-zinc-800/60"
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600 w-4 shrink-0">{idx + 1}</span>
        <div className="flex-1 grid grid-cols-2 gap-2">
          {mode === "reps" && (
            <>
              <input
                type="number"
                value={set.weight_kg}
                onChange={(e) => u("weight_kg", e.target.value)}
                placeholder="Poids kg"
                min="0"
                step="0.5"
                className="w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <input
                type="number"
                value={set.reps}
                onChange={(e) => u("reps", e.target.value)}
                placeholder="Reps"
                min="1"
                className="w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </>
          )}
          {mode === "reps_duration" && (
            <>
              <input
                type="number"
                value={set.reps}
                onChange={(e) => u("reps", e.target.value)}
                placeholder="Reps"
                min="1"
                className="w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <input
                type="number"
                value={set.duration_min}
                onChange={(e) => u("duration_min", e.target.value)}
                placeholder="Durée (min)"
                min="0"
                step="0.5"
                className="w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </>
          )}
          {mode === "duration" && (
            <input
              type="number"
              value={set.duration_min}
              onChange={(e) => u("duration_min", e.target.value)}
              placeholder="Durée (min)"
              min="0"
              step="0.5"
              className="col-span-2 w-full bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          )}
        </div>
        <input
          type="number"
          value={set.rpe}
          onChange={(e) => u("rpe", e.target.value)}
          placeholder="RPE"
          min="1"
          max="10"
          step="0.5"
          className="w-14 bg-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => u("is_warmup", !set.is_warmup)}
          className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
            set.is_warmup
              ? "border-amber-500/50 bg-amber-950/30 text-amber-400"
              : "border-zinc-600 text-zinc-500 hover:border-amber-500/50"
          }`}
        >
          Chauffe
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="text-zinc-600 hover:text-red-400 transition-colors text-sm px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function ManualSessionForm({
  exercises,
  globalExercises = [],
  weightKg = 70,
}: {
  exercises:       Exercise[];
  globalExercises?: GlobalExercise[];
  weightKg?:       number;
}) {
  const router = useRouter();

  const [name,            setName]            = useState("");
  const [date,            setDate]            = useState(new Date().toISOString().slice(0, 10));
  const [notes,           setNotes]           = useState("");
  const [entries,         setEntries]         = useState<ExerciseEntry[]>([]);
  const [showPicker,      setShowPicker]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [allUserExercises, setAllUserExercises] = useState<Exercise[]>(exercises);
  const [importingGlobal, setImportingGlobal] = useState(false);

  // Exercices utilisateur non encore ajoutés à la séance
  const pickerUserExercises = useMemo(
    () => allUserExercises.filter((ex) => !entries.some((e) => e.exercise.id === ex.id)),
    [allUserExercises, entries]
  );

  // Exercices globaux non encore dans la bibliothèque perso ni dans la séance
  const pickerGlobalExercises = useMemo(
    () => globalExercises.filter(
      (g) =>
        !allUserExercises.some((e) => e.name.toLowerCase() === g.name.toLowerCase()) &&
        !entries.some((e) => e.exercise.name.toLowerCase() === g.name.toLowerCase())
    ),
    [globalExercises, allUserExercises, entries]
  );

  const kcalPreview = useMemo(
    () => previewKcal(entries, weightKg),
    [entries, weightKg]
  );

  function addExerciseEntry(ex: Exercise) {
    if (entries.some((e) => e.exercise.id === ex.id)) return; // déjà ajouté
    setEntries((prev) => [...prev, { exercise: ex, sets: [emptySet()] }]);
    setShowPicker(false);
  }

  async function importAndSelectExercise(global: GlobalExercise): Promise<Exercise | null> {
    setImportingGlobal(true);
    const result = await createExerciseAction({
      name:          global.name,
      muscle_group:  global.muscle_group,
      category:      global.category,
      tracking_mode: global.tracking_mode,
      notes:         null,
    });
    setImportingGlobal(false);
    if (!result.success) { setError(result.error); return null; }
    setAllUserExercises((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
    return result.data;
  }

  function removeExercise(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSet(exIdx: number) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, emptySet()] } : e
      )
    );
  }

  function updateSet(exIdx: number, setId: number, updated: SetRow) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? updated : s)) }
          : e
      )
    );
  }

  function removeSet(exIdx: number, setId: number) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e
      ).filter((e) => e.sets.length > 0 || true) // on garde l'exercice même sans sets
    );
  }

  function moveExercise(idx: number, dir: -1 | 1) {
    setEntries((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom de la séance est requis."); return; }
    if (!date)        { setError("La date est requise.");            return; }
    if (entries.length === 0) { setError("Ajoute au moins un exercice."); return; }

    // Construit les sets à envoyer
    const sets: ManualSetInput[] = [];
    let setNumber = 1;
    for (const { exercise, sets: setRows } of entries) {
      for (const s of setRows) {
        const reps    = parseInt(s.reps)         || null;
        const weight  = parseFloat(s.weight_kg)   || null;
        const dur     = parseFloat(s.duration_min)
          ? Math.round(parseFloat(s.duration_min) * 60)
          : null;
        const rpe     = parseFloat(s.rpe)         || null;

        sets.push({
          exercise_id:      exercise.id,
          set_number:       setNumber++,
          reps,
          weight_kg:        weight,
          duration_seconds: dur,
          rpe,
          is_warmup:        s.is_warmup,
        });
      }
    }

    setSaving(true);
    setError(null);
    const res = await createManualSessionAction({
      name:  name.trim(),
      date,
      notes: notes || null,
      sets,
    });
    setSaving(false);

    if (!res.success) { setError(res.error); return; }
    router.push(`/sessions/${res.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Nom + date */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Informations</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Nom de la séance</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Push day, Full body…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Notes (optionnel)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexte, ressenti…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Ajouter exercice — bouton ouvrant le picker */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-2">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Exercices</p>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          disabled={importingGlobal}
          className="w-full border border-dashed border-zinc-700 hover:border-orange-500 rounded-xl py-2.5 text-sm text-zinc-400 hover:text-orange-400 disabled:opacity-50 transition-colors"
        >
          {importingGlobal ? "Importation…" : "+ Ajouter un exercice"}
        </button>
        {allUserExercises.length === 0 && globalExercises.length === 0 && (
          <p className="text-[11px] text-zinc-500">
            Aucun exercice dans ta bibliothèque.{" "}
            <a href="/exercises" className="text-orange-400 hover:underline">Créer →</a>
          </p>
        )}
        {pickerUserExercises.length === 0 && pickerGlobalExercises.length === 0 && entries.length > 0 && (
          <p className="text-[11px] text-zinc-600">Tous tes exercices ont été ajoutés.</p>
        )}
      </div>

      {/* ExercisePicker (full-screen overlay) */}
      {showPicker && (
        <ExercisePicker
          exercises={pickerUserExercises}
          globalExercises={pickerGlobalExercises}
          onSelect={addExerciseEntry}
          onImportAndSelect={importAndSelectExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Liste des exercices */}
      {entries.map((entry, exIdx) => (
        <div key={entry.exercise.id} className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
          {/* Header exercice */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{entry.exercise.name}</p>
              <p className="text-[10px] text-zinc-500">
                {entry.exercise.muscle_group
                  ? MUSCLE_LABEL[entry.exercise.muscle_group]
                  : ""}
                {" · "}
                {entry.exercise.tracking_mode === "reps"
                  ? "Reps + poids"
                  : entry.exercise.tracking_mode === "duration"
                  ? "Durée"
                  : "Reps + durée"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {exIdx > 0 && (
                <button type="button" onClick={() => moveExercise(exIdx, -1)}
                  className="text-zinc-500 hover:text-white px-1.5 py-1 text-xs">↑</button>
              )}
              {exIdx < entries.length - 1 && (
                <button type="button" onClick={() => moveExercise(exIdx, 1)}
                  className="text-zinc-500 hover:text-white px-1.5 py-1 text-xs">↓</button>
              )}
              <button type="button" onClick={() => removeExercise(exIdx)}
                className="text-zinc-600 hover:text-red-400 text-xs px-2 py-1 transition-colors">
                Retirer
              </button>
            </div>
          </div>

          {/* En-têtes colonnes */}
          <div className="flex gap-2 text-[9px] text-zinc-600 px-3 overflow-hidden">
            <span className="w-4 shrink-0" />
            {(entry.exercise.tracking_mode === "reps" || entry.exercise.tracking_mode === "reps_duration") && (
              <>
                {entry.exercise.tracking_mode === "reps" && <span className="flex-1 truncate">Poids (kg)</span>}
                <span className="flex-1 truncate">Reps</span>
              </>
            )}
            {(entry.exercise.tracking_mode === "duration" || entry.exercise.tracking_mode === "reps_duration") && (
              <span className="flex-1 truncate">Durée (min)</span>
            )}
            <span className="w-14 shrink-0">RPE</span>
            <span className="w-12 shrink-0">Chauffe</span>
            <span className="w-6 shrink-0" />
          </div>

          {/* Sets */}
          <div className="space-y-2">
            {entry.sets.map((s, si) => (
              <SetRowInput
                key={s.id}
                set={s}
                mode={entry.exercise.tracking_mode}
                idx={si}
                onChange={(updated) => updateSet(exIdx, s.id, updated)}
                onRemove={() => removeSet(exIdx, s.id)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => addSet(exIdx)}
            className="w-full text-xs text-zinc-500 hover:text-orange-400 border border-dashed border-zinc-700 hover:border-orange-500/50 rounded-xl py-2 transition-colors"
          >
            + Ajouter une série
          </button>
        </div>
      ))}

      {/* Preview kcal */}
      {entries.length > 0 && kcalPreview > 0 && (
        <div className="flex items-center justify-between bg-zinc-800/40 rounded-xl px-4 py-3 border border-zinc-700/50">
          <span className="text-xs text-zinc-500">Calories estimées (exercices)</span>
          <span className="text-sm font-bold text-orange-400">
            ~{kcalPreview.toLocaleString("fr-FR")} kcal
          </span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || entries.length === 0}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-bold py-3 rounded-xl transition-colors"
      >
        {saving ? "Enregistrement…" : "Enregistrer la séance"}
      </button>
    </form>
  );
}
