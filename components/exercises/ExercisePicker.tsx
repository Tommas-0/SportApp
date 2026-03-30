"use client";

import { useState, useMemo } from "react";
import type { Exercise, GlobalExercise, MuscleGroup } from "@/types";

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

type Item =
  | { kind: "user";   ex: Exercise }
  | { kind: "global"; ex: GlobalExercise };

type Props = {
  /** Exercices utilisateur à afficher (déjà filtrés par le parent si nécessaire) */
  exercises:           Exercise[];
  /** Exercices globaux à afficher (déjà filtrés par le parent si nécessaire) */
  globalExercises?:    GlobalExercise[];
  /** Appelé quand l'utilisateur sélectionne un exercice utilisateur */
  onSelect:            (exercise: Exercise) => void;
  /** Appelé quand l'utilisateur sélectionne un exercice global (à importer) */
  onImportAndSelect?:  (global: GlobalExercise) => Promise<Exercise | null>;
  onClose:             () => void;
};

export function ExercisePicker({
  exercises,
  globalExercises = [],
  onSelect,
  onImportAndSelect,
  onClose,
}: Props) {
  const [search,         setSearch]         = useState("");
  const [groupFilter,    setGroupFilter]    = useState<MuscleGroup | "all">("all");
  const [subgroupFilter, setSubgroupFilter] = useState<string | "all">("all");
  const [catFilter,      setCatFilter]      = useState<"all" | "strength" | "cardio">("all");
  const [importing,      setImporting]      = useState<string | null>(null);

  const allItems = useMemo<Item[]>(() => {
    const userItems:   Item[] = exercises.map((ex) => ({ kind: "user",   ex }));
    const globalItems: Item[] = globalExercises.map((ex) => ({ kind: "global", ex }));
    return [...userItems, ...globalItems];
  }, [exercises, globalExercises]);

  // Groupes disponibles (avec au moins 1 exercice)
  const availableGroups = useMemo(() => {
    const set = new Set(allItems.map((i) => i.ex.muscle_group).filter(Boolean));
    return MUSCLE_GROUPS.filter((g) => set.has(g.value));
  }, [allItems]);

  // Sous-groupes disponibles pour le groupe sélectionné
  const availableSubgroups = useMemo(() => {
    if (groupFilter === "all") return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const item of allItems) {
      if (item.ex.muscle_group !== groupFilter) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sg = (item.ex as any).muscle_subgroup;
      if (sg) map.set(sg.id, sg);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems, groupFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allItems.filter((item) => {
      if (q && !item.ex.name.toLowerCase().includes(q)) return false;
      if (groupFilter !== "all" && item.ex.muscle_group !== groupFilter) return false;
      if (subgroupFilter !== "all") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sg = (item.ex as any).muscle_subgroup;
        if (!sg || sg.id !== subgroupFilter) return false;
      }
      if (catFilter !== "all" && item.ex.category !== catFilter) return false;
      return true;
    });
  }, [allItems, search, groupFilter, subgroupFilter, catFilter]);

  async function handleTap(item: Item) {
    if (item.kind === "user") {
      onSelect(item.ex);
      return;
    }
    if (!onImportAndSelect) return;
    setImporting(item.ex.id);
    const imported = await onImportAndSelect(item.ex);
    setImporting(null);
    if (imported) onSelect(imported);
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/80 shrink-0">
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white text-xl leading-none transition-colors"
        >
          ←
        </button>
        <h2 className="text-sm font-semibold text-white flex-1">Ajouter un exercice</h2>
        <span className="text-[11px] text-zinc-600">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {/* ── Barre de recherche ── */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <input
          type="text"
          placeholder="Rechercher un exercice…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) {
              setGroupFilter("all");
              setSubgroupFilter("all");
            }
          }}
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* ── Filtres (masqués pendant la recherche) ── */}
      {!search && (
        <>
          {/* Niveau 1 : groupe musculaire */}
          <div className="px-4 pb-2 shrink-0 flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => { setGroupFilter("all"); setSubgroupFilter("all"); }}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                groupFilter === "all"
                  ? "bg-orange-600 border-orange-600 text-white"
                  : "border-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              Tous
            </button>
            {availableGroups.map((g) => (
              <button
                key={g.value}
                onClick={() => { setGroupFilter(g.value); setSubgroupFilter("all"); }}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                  groupFilter === g.value
                    ? "bg-orange-600 border-orange-600 text-white"
                    : "border-zinc-700 text-zinc-300 hover:text-white"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Niveau 2 : sous-groupe */}
          {availableSubgroups.length > 0 && (
            <div className="px-4 pb-2 shrink-0 flex gap-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setSubgroupFilter("all")}
                className={`shrink-0 text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  subgroupFilter === "all"
                    ? "bg-zinc-600 border-zinc-600 text-white"
                    : "border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                Tous
              </button>
              {availableSubgroups.map((sg) => (
                <button
                  key={sg.id}
                  onClick={() => setSubgroupFilter(sg.id)}
                  className={`shrink-0 text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                    subgroupFilter === sg.id
                      ? "bg-zinc-600 border-zinc-600 text-white"
                      : "border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  {sg.name}
                </button>
              ))}
            </div>
          )}

          {/* Type : muscu / cardio */}
          <div className="px-4 pb-3 shrink-0 flex gap-1.5">
            {(["all", "strength", "cardio"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                  catFilter === c
                    ? "bg-zinc-700 border-zinc-600 text-white"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {c === "all" ? "Tout" : c === "strength" ? "Musculation" : "Cardio"}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Liste ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {filtered.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-12">Aucun résultat.</p>
        ) : (
          <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/60">
            {filtered.map((item) => {
              const isImporting = importing === item.ex.id;
              const isGlobal    = item.kind === "global";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sg          = (item.ex as any).muscle_subgroup;
              const groupLabel  = MUSCLE_GROUPS.find((g) => g.value === item.ex.muscle_group)?.label;

              return (
                <button
                  key={`${item.kind}-${item.ex.id}`}
                  onClick={() => handleTap(item)}
                  disabled={isImporting}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40 active:bg-zinc-800/60 transition-colors disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.ex.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                      {groupLabel}
                      {sg    ? ` · ${sg.name}`      : ""}
                      {isGlobal ? " · Bibliothèque" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-orange-400 shrink-0 ml-3 font-medium">
                    {isImporting ? "…" : "+ Ajouter"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
