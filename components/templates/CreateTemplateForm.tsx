"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTemplateAction, updateTemplateAction, upsertTemplateExercisesAction } from "@/app/actions/templates";
import { createExerciseAction } from "@/app/actions/exercises";
import type { Exercise, GlobalExercise, MuscleGroup, TemplateExercise, WorkoutTemplate } from "@/types";

type ExerciseRow = {
  exercise_id: string;
  name: string;
  order_index: number;
  default_sets: string;
  default_reps: string;
  default_weight: string;
  rest_seconds: string;
  notes: string;
};

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

const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors";
const labelCls = "block text-[11px] text-zinc-500 uppercase tracking-wide mb-1";

type Props = {
  exercises:          Exercise[];
  globalExercises?:   GlobalExercise[];
  template?:          WorkoutTemplate;
  templateExercises?: TemplateExercise[];
};

function teToRow(te: TemplateExercise): ExerciseRow {
  return {
    exercise_id:    te.exercise_id,
    name:           te.exercise?.name ?? "",
    order_index:    te.order_index,
    default_sets:   te.default_sets?.toString()   ?? "3",
    default_reps:   te.default_reps?.toString()   ?? "10",
    default_weight: te.default_weight?.toString() ?? "",
    rest_seconds:   te.rest_seconds?.toString()   ?? "",
    notes:          te.notes                       ?? "",
  };
}

export function CreateTemplateForm({ exercises, globalExercises = [], template, templateExercises }: Props) {
  const router = useRouter();
  const isEdit = !!template;

  const [name,        setName]        = useState(template?.name        ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [rows,        setRows]        = useState<ExerciseRow[]>(
    templateExercises
      ? [...templateExercises].sort((a, b) => a.order_index - b.order_index).map(teToRow)
      : []
  );
  const [error,         setError]         = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [importingGlob, setImportingGlob] = useState(false);

  const [showNewEx,   setShowNewEx]   = useState(false);
  const [newExName,   setNewExName]   = useState("");
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>("other");
  const [creatingEx,  setCreatingEx]  = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>(exercises);

  async function handleCreateExercise() {
    if (!newExName.trim()) return;
    setCreatingEx(true);
    const result = await createExerciseAction({ name: newExName.trim(), muscle_group: newExMuscle, category: "strength", tracking_mode: "reps", notes: null });
    setCreatingEx(false);
    if (!result.success) { setError(result.error); return; }
    setAllExercises((prev) => [...prev, result.data]);
    addRow(result.data);
    setNewExName("");
    setShowNewEx(false);
  }

  async function handleAddGlobal(globalId: string) {
    const g = globalExercises.find((x) => x.id === globalId);
    if (!g) return;
    setImportingGlob(true);
    const result = await createExerciseAction({
      name:          g.name,
      muscle_group:  g.muscle_group,
      category:      g.category,
      tracking_mode: g.tracking_mode,
      notes:         null,
    });
    setImportingGlob(false);
    if (!result.success) { setError(result.error); return; }
    setAllExercises((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
    addRow(result.data);
  }

  function addRow(ex: Exercise) {
    setRows((prev) => [...prev, { exercise_id: ex.id, name: ex.name, order_index: prev.length, default_sets: "3", default_reps: "10", default_weight: "", rest_seconds: "", notes: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i).map((r, j) => ({ ...r, order_index: j })));
  }

  function moveRow(i: number, dir: "up" | "down") {
    setRows((prev) => {
      const next = [...prev];
      const j    = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((r, k) => ({ ...r, order_index: k }));
    });
  }

  function updateRow(i: number, field: keyof ExerciseRow, value: string) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  }

  const exercisePayload = rows.map((r) => ({
    exercise_id:    r.exercise_id,
    order_index:    r.order_index,
    default_sets:   r.default_sets   ? Number(r.default_sets)   : undefined,
    default_reps:   r.default_reps   ? Number(r.default_reps)   : undefined,
    default_weight: r.default_weight ? Number(r.default_weight) : undefined,
    rest_seconds:   r.rest_seconds   ? Number(r.rest_seconds)   : undefined,
    notes:          r.notes          || undefined,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setError(null);
    setLoading(true);

    if (isEdit && template) {
      const [r1, r2] = await Promise.all([
        updateTemplateAction(template.id, { name: name.trim(), description: description.trim() || undefined }),
        upsertTemplateExercisesAction(template.id, exercisePayload),
      ]);
      setLoading(false);
      if (!r1.success) { setError(r1.error); return; }
      if (!r2.success) { setError(r2.error); return; }
    } else {
      const result = await createTemplateAction({ name: name.trim(), description: description.trim() || undefined, exercises: exercisePayload });
      setLoading(false);
      if (!result.success) { setError(result.error); return; }
    }

    router.push("/templates");
  }

  const unusedExercises = allExercises.filter((ex) => !rows.some((r) => r.exercise_id === ex.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Infos programme */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
        <div>
          <label className={labelCls}>Nom</label>
          <input className={inputCls} placeholder="Ex : Push Day" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Description <span className="normal-case text-zinc-600">(optionnel)</span></label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            placeholder="Ex : Pectoraux, épaules, triceps"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Exercices */}
      <div className="space-y-2">
        <p className={labelCls}>Exercices{rows.length > 0 && ` (${rows.length})`}</p>

        {rows.length === 0 && (
          <p className="text-xs text-zinc-700 py-2">Aucun exercice ajouté.</p>
        )}

        {rows.map((row, i) => (
          <div key={row.exercise_id} className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden">
            {/* En-tête exercice */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col shrink-0">
                  <button type="button" onClick={() => moveRow(i, "up")} disabled={i === 0}
                    className="text-zinc-700 hover:text-zinc-400 disabled:opacity-20 leading-none text-[10px] px-0.5">▲</button>
                  <button type="button" onClick={() => moveRow(i, "down")} disabled={i === rows.length - 1}
                    className="text-zinc-700 hover:text-zinc-400 disabled:opacity-20 leading-none text-[10px] px-0.5">▼</button>
                </div>
                <span className="text-sm font-medium text-white truncate">{row.name}</span>
              </div>
              <button type="button" onClick={() => removeRow(i)}
                className="text-zinc-700 hover:text-red-400 transition-colors text-base leading-none px-1 shrink-0">×</button>
            </div>

            {/* Champs */}
            <div className="px-3 py-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Séries</label>
                  <input type="number" min="1" className={inputCls} value={row.default_sets} onChange={(e) => updateRow(i, "default_sets", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Reps</label>
                  <input type="number" min="1" className={inputCls} value={row.default_reps} onChange={(e) => updateRow(i, "default_reps", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Poids kg</label>
                  <input type="number" min="0" step="0.5" placeholder="—" className={inputCls} value={row.default_weight} onChange={(e) => updateRow(i, "default_weight", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Repos sec</label>
                  <input type="number" min="0" step="15" placeholder="—" className={inputCls} value={row.rest_seconds} onChange={(e) => updateRow(i, "rest_seconds", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <input type="text" placeholder="ex : descente lente" className={inputCls} value={row.notes} onChange={(e) => updateRow(i, "notes", e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Ajouter existant ou global */}
        {(() => {
          const unusedGlobal = globalExercises.filter(
            (g) => !allExercises.some((e) => e.name.toLowerCase() === g.name.toLowerCase())
                && !rows.some((r) => r.name.toLowerCase() === g.name.toLowerCase())
          );
          if (unusedExercises.length === 0 && unusedGlobal.length === 0) return null;
          return (
            <select
              className={`${inputCls} text-zinc-500`}
              value=""
              disabled={importingGlob}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith("global_")) {
                  handleAddGlobal(val.slice(7));
                } else {
                  const ex = allExercises.find((x) => x.id === val);
                  if (ex) addRow(ex);
                }
              }}
            >
              <option value="" disabled>
                {importingGlob ? "Import en cours…" : "+ Ajouter un exercice…"}
              </option>
              {unusedExercises.length > 0 && (
                <optgroup label="Mes exercices">
                  {unusedExercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              )}
              {unusedGlobal.length > 0 && (
                <optgroup label="Bibliothèque globale">
                  {unusedGlobal.map((g) => (
                    <option key={g.id} value={`global_${g.id}`}>{g.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          );
        })()}

        {/* Créer nouveau exercice */}
        {!showNewEx ? (
          <button type="button" onClick={() => setShowNewEx(true)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            + Créer un nouvel exercice
          </button>
        ) : (
          <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-3 space-y-2">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Nouvel exercice</p>
            <input className={inputCls} placeholder="Nom de l'exercice" value={newExName} onChange={(e) => setNewExName(e.target.value)} autoFocus />
            <select className={`${inputCls} text-zinc-300`} value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value as MuscleGroup)}>
              {MUSCLE_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={handleCreateExercise} disabled={creatingEx}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
                {creatingEx ? "…" : "Créer et ajouter"}
              </button>
              <button type="button" onClick={() => { setShowNewEx(false); setNewExName(""); }}
                className="px-4 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg py-2 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 border border-red-900/50 bg-red-950/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-orange-900/20"
      >
        {loading ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer le programme"}
      </button>
    </form>
  );
}
