"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { logSetAction, deleteSetAction } from "@/app/actions/sets";
import { endSessionAction, cancelSessionAction } from "@/app/actions/sessions";
import { saveCardioSegmentsAction } from "@/app/actions/cardio";
import { addToQueue } from "@/lib/sync-queue";
import {
  formatSetDisplay,
  formatDurationSeconds,
  resolveTrackingMode,
  isPR as checkIsPR,
} from "@/lib/exercise-validation";
import type {
  WorkoutSession, TemplateExercise, WorkoutSet,
  Exercise, MuscleGroup, TrackingMode,
} from "@/types";

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Pectoraux", back: "Dos", shoulders: "Épaules", arms: "Bras",
  legs: "Jambes", glutes: "Fessiers", core: "Abdos", cardio: "Cardio",
  full_body: "Full body", other: "Autre",
};

// ─── Types locaux ─────────────────────────────────────────────

type ExerciseSlot = {
  exercise_id:               string;
  name:                      string;
  muscle_group?:             string | null;
  tracking_mode:             TrackingMode;
  default_weight?:           number | null;
  default_reps?:             number | null;
  default_duration_seconds?: number | null;
  rest_seconds?:             number | null;
};

type ExerciseInput = {
  weight:     string;
  reps:       string;
  duration:   string;  // secondes, en string pour le binding
  speed:      string;  // km/h cardio
  incline:    string;  // % inclinaison
  loading:    boolean;
};

type Stopwatch = {
  running:        boolean;
  paused:         boolean;
  elapsed:        number;
  segmentStartTs: number | null;
  segments:       Array<{ startedAt: number; endedAt: number }>;
};

type Props = {
  session:           WorkoutSession;
  templateExercises: TemplateExercise[];
  lastSets?:         Record<string, WorkoutSet[]>;
  bestWeights?:      Record<string, number>;  // PR poids (mode reps)
  bestDurations?:    Record<string, number>;  // PR durée (mode duration)
  allExercises?:     Exercise[];
};

type Summary = {
  sessionId:   string;
  name:        string;
  totalSets:   number;
  totalVolume: number;
  prCount:     number;
  durationMin: number;
};

// ─── Composant principal ──────────────────────────────────────

export function ActiveSession({
  session,
  templateExercises,
  lastSets     = {},
  bestWeights  = {},
  bestDurations = {},
  allExercises = [],
}: Props) {
  const router = useRouter();
  const toast  = useToast();

  const [ending,    setEnding]    = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notes,     setNotes]     = useState("");
  const [summary,   setSummary]   = useState<Summary | null>(null);

  // Temps réel de début de la séance (ouverture de la page), indépendant de started_at
  const workoutStartRef = useRef(Date.now());

  // ─── Exercices ───────────────────────────────────────────────

  const [slots, setSlots] = useState<ExerciseSlot[]>(() =>
    templateExercises.map((te) => ({
      exercise_id:              te.exercise_id,
      name:                     te.exercise?.name ?? "Exercice",
      muscle_group:             te.exercise?.muscle_group,
      tracking_mode:            resolveTrackingMode(te.exercise),
      default_weight:           te.default_weight,
      default_reps:             te.default_reps,
      default_duration_seconds: te.default_duration_seconds,
      rest_seconds:             te.rest_seconds,
    }))
  );

  const [sets, setSets] = useState<Record<string, WorkoutSet[]>>(() =>
    Object.fromEntries(templateExercises.map((te) => [te.exercise_id, []]))
  );

  const [inputs, setInputs] = useState<Record<string, ExerciseInput>>(() =>
    Object.fromEntries(
      templateExercises.map((te) => {
        // Priorité : valeurs du set #1 de la dernière séance > valeurs du template
        const prevFirst = lastSets[te.exercise_id]?.[0];
        return [
          te.exercise_id,
          {
            weight:      prevFirst?.weight_kg        != null ? String(prevFirst.weight_kg)        : (te.default_weight?.toString()           ?? ""),
            reps:        prevFirst?.reps             != null ? String(prevFirst.reps)             : (te.default_reps?.toString()             ?? ""),
            duration:    prevFirst?.duration_seconds != null ? String(prevFirst.duration_seconds) : (te.default_duration_seconds?.toString() ?? ""),
            speed:       prevFirst?.speed_kmh        != null ? String(prevFirst.speed_kmh)        : "",
            incline:     prevFirst?.incline_pct      != null ? String(prevFirst.incline_pct)      : "",
            loading:     false,
          },
        ];
      })
    )
  );

  function updateInput(exerciseId: string, field: keyof ExerciseInput, value: string) {
    setInputs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], [field]: value } }));
  }

  /** Copie les valeurs d'un WorkoutSet existant dans les inputs d'un exercice. */
  function fillFromSet(exerciseId: string, s: WorkoutSet) {
    setInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        weight:      s.weight_kg        != null ? String(s.weight_kg)        : "",
        reps:        s.reps             != null ? String(s.reps)             : "",
        duration:    s.duration_seconds != null ? String(s.duration_seconds) : "",
        speed:       s.speed_kmh        != null ? String(s.speed_kmh)        : "",
        incline:     s.incline_pct      != null ? String(s.incline_pct)      : "",
      },
    }));
  }

  // ─── Minuteur de repos ───────────────────────────────────────

  const [restTimers, setRestTimers] = useState<Record<string, number>>({});

  useEffect(() => {
    const active = Object.values(restTimers).some((v) => v > 0);
    if (!active) return;
    const id = setInterval(() => {
      setRestTimers((prev) => {
        const next = { ...prev };
        let anyDone = false;
        for (const key in next) {
          if (next[key] > 0) {
            next[key]--;
            if (next[key] === 0) anyDone = true;
          }
        }
        if (anyDone && typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restTimers]);

  // ─── Chronomètre de série (mode duration) ────────────────────

  const [stopwatches, setStopwatches] = useState<Record<string, Stopwatch>>({});

  useEffect(() => {
    const anyRunning = Object.values(stopwatches).some((sw) => sw.running);
    if (!anyRunning) return;
    const id = setInterval(() => {
      setStopwatches((prev) => {
        const next = { ...prev };
        for (const key in next) {
          if (next[key].running) next[key] = { ...next[key], elapsed: next[key].elapsed + 1 };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stopwatches]);

  // Ref pour lire elapsed dans stopStopwatch sans dépendre d'un état stale
  const swRef = useRef<Record<string, Stopwatch>>({});
  useEffect(() => { swRef.current = stopwatches; }, [stopwatches]);

  const IDLE_SW: Stopwatch = { running: false, paused: false, elapsed: 0, segmentStartTs: null, segments: [] };

  function startStopwatch(exerciseId: string) {
    setStopwatches((prev) => ({
      ...prev,
      [exerciseId]: { running: true, paused: false, elapsed: 0, segmentStartTs: Date.now(), segments: [] },
    }));
    updateInput(exerciseId, "duration", "");
  }

  function pauseStopwatch(exerciseId: string) {
    const sw = swRef.current[exerciseId];
    if (!sw?.running || !sw.segmentStartTs) return;
    const now = Date.now();
    setStopwatches((prev) => ({
      ...prev,
      [exerciseId]: {
        ...sw,
        running:        false,
        paused:         true,
        segmentStartTs: null,
        segments:       [...sw.segments, { startedAt: sw.segmentStartTs!, endedAt: now }],
      },
    }));
  }

  function resumeStopwatch(exerciseId: string) {
    setStopwatches((prev) => {
      const sw = prev[exerciseId];
      if (!sw?.paused) return prev;
      return { ...prev, [exerciseId]: { ...sw, running: true, paused: false, segmentStartTs: Date.now() } };
    });
  }

  function stopStopwatch(exerciseId: string) {
    const sw = swRef.current[exerciseId];
    if (!sw) return;
    const now = Date.now();
    const finalSegments = sw.running && sw.segmentStartTs
      ? [...sw.segments, { startedAt: sw.segmentStartTs, endedAt: now }]
      : sw.segments;
    setStopwatches((prev) => ({
      ...prev,
      [exerciseId]: { ...sw, running: false, paused: false, segmentStartTs: null, segments: finalSegments },
    }));
    updateInput(exerciseId, "duration", String(sw.elapsed));
  }

  function resetStopwatch(exerciseId: string) {
    setStopwatches((prev) => ({ ...prev, [exerciseId]: { ...IDLE_SW } }));
    updateInput(exerciseId, "duration", "");
  }

  function adjustDuration(exerciseId: string, deltaSec: number) {
    setInputs((prev) => {
      const current = Number(prev[exerciseId]?.duration || "0") || 0;
      const next    = Math.max(0, current + deltaSec);
      setStopwatches((sw) => {
        const existing = sw[exerciseId] ?? IDLE_SW;
        return { ...sw, [exerciseId]: { ...existing, running: false, paused: false, elapsed: next } };
      });
      return { ...prev, [exerciseId]: { ...prev[exerciseId], duration: String(next) } };
    });
  }

  // ─── Picker d'exercice supplémentaire ────────────────────────

  const [showPicker,     setShowPicker]     = useState(false);
  const [pickerSelected, setPickerSelected] = useState<string | null>(null);
  /** Surcharge du mode de suivi par exercise_id dans le picker */
  const [pickerModes,    setPickerModes]    = useState<Record<string, TrackingMode>>({});

  const usedIds   = new Set(slots.map((s) => s.exercise_id));
  const available = allExercises.filter((e) => !usedIds.has(e.id));

  function openPicker() {
    setPickerSelected(null);
    setPickerModes({});
    setShowPicker(true);
  }

  function closePicker() {
    setShowPicker(false);
    setPickerSelected(null);
    setPickerModes({});
  }

  function confirmPicker() {
    if (!pickerSelected) return;
    const ex = allExercises.find((x) => x.id === pickerSelected);
    if (!ex) return;
    const mode = pickerModes[ex.id] ?? resolveTrackingMode(ex);
    setSlots((prev) => [...prev, {
      exercise_id:   ex.id,
      name:          ex.name,
      muscle_group:  ex.muscle_group,
      tracking_mode: mode,
    }]);
    setSets((prev)   => ({ ...prev, [ex.id]: [] }));
    setInputs((prev) => ({ ...prev, [ex.id]: { weight: "", reps: "", duration: "", speed: "", incline: "", loading: false } }));
    closePicker();
  }

  // ─── Enregistrement d'une série ──────────────────────────────

  const handleLogSet = useCallback(
    async (exerciseId: string) => {
      const input        = inputs[exerciseId];
      const slot         = slots.find((s) => s.exercise_id === exerciseId)!;
      const trackingMode = slot.tracking_mode;
      const setNumber    = (sets[exerciseId]?.length ?? 0) + 1;

      setInputs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], loading: true } }));

      const payload = {
        session_id:       session.id,
        exercise_id:      exerciseId,
        set_number:       setNumber,
        tracking_mode:    trackingMode,
        reps:             input.reps       ? Number(input.reps)       : undefined,
        weight_kg:        input.weight     ? Number(input.weight)     : undefined,
        duration_seconds: input.duration   ? Number(input.duration)   : undefined,
        speed_kmh:        input.speed      ? Number(input.speed)      : undefined,
        incline_pct:      input.incline    ? Number(input.incline)    : undefined,
      } as const;

      // Hors ligne → queue locale + feedback optimiste
      if (!navigator.onLine) {
        addToQueue(payload);
        setInputs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], loading: false } }));
        setSets((prev) => ({
          ...prev,
          [exerciseId]: [...(prev[exerciseId] ?? []), {
            id: `queued-${Date.now()}`, session_id: session.id, exercise_id: exerciseId,
            set_number:       setNumber,
            reps:             payload.reps             ?? null,
            weight_kg:        payload.weight_kg        ?? null,
            duration_seconds: payload.duration_seconds ?? null,
            is_warmup: false, completed_at: new Date().toISOString(), exercise: null,
          } as any],
        }));
        setRestTimers((prev) => ({ ...prev, [exerciseId]: slot.rest_seconds ?? 90 }));
        toast.warning("Hors ligne — série sauvegardée localement");
        return;
      }

      const result = await logSetAction(payload);
      setInputs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], loading: false } }));

      if (!result.success) {
        toast.error(`Erreur : ${result.error}`);
        return;
      }

      setSets((prev) => ({ ...prev, [exerciseId]: [...(prev[exerciseId] ?? []), result.data] }));

      // Segments cardio (pause/reprise) — fire-and-forget
      const swData = swRef.current[exerciseId];
      if (swData?.segments.length) {
        saveCardioSegmentsAction(result.data.id, swData.segments).catch(() => {});
      }

      // Détection PR selon le mode
      const metrics = {
        weight_kg:        payload.weight_kg,
        duration_seconds: payload.duration_seconds,
        reps:             payload.reps,
      };
      const prevBest = trackingMode === "reps"
        ? (bestWeights[exerciseId]  ?? 0)
        : (bestDurations[exerciseId] ?? 0);

      if (checkIsPR(trackingMode, metrics, prevBest)) {
        const label = trackingMode === "reps"
          ? `${payload.weight_kg} kg`
          : formatDurationSeconds(payload.duration_seconds!);
        toast.success(`🏆 Nouveau record — ${label} !`, 6000);
      }

      setRestTimers((prev) => ({ ...prev, [exerciseId]: slot.rest_seconds ?? 90 }));

      // Réinitialiser le chrono après validation
      if (trackingMode !== "reps") resetStopwatch(exerciseId);
    },
    [inputs, sets, session.id, slots, bestWeights, bestDurations]
  );

  async function handleDeleteSet(exerciseId: string, setId: string) {
    const result = await deleteSetAction(setId, session.id);
    if (!result.success) return;
    setSets((prev) => ({ ...prev, [exerciseId]: prev[exerciseId].filter((s) => s.id !== setId) }));
  }

  async function handleEnd() {
    if (totalSets === 0) {
      if (!window.confirm("Aucune série enregistrée. Terminer quand même ?")) return;
    }
    setEnding(true);
    const realElapsedMs = Date.now() - workoutStartRef.current;
    const endedAt = new Date(new Date(session.started_at).getTime() + realElapsedMs).toISOString();
    const result = await endSessionAction(session.id, notes || undefined, endedAt);
    if (!result.success) { setEnding(false); return; }

    const allSets    = Object.values(sets).flat();
    const volume     = allSets.reduce((sum, s) => sum + (s.reps ?? 0) * Number(s.weight_kg ?? 0), 0);
    const prCount    = slots.filter((slot) => {
      const mode    = slot.tracking_mode;
      const slotSets = sets[slot.exercise_id] ?? [];
      if (mode === "reps") {
        const best = Math.max(0, ...slotSets.map((s) => s.weight_kg ?? 0));
        return best > 0 && best > (bestWeights[slot.exercise_id] ?? 0);
      } else {
        const best = Math.max(0, ...slotSets.map((s) => s.duration_seconds ?? 0));
        return best > 0 && best > (bestDurations[slot.exercise_id] ?? 0);
      }
    }).length;
    const durationMin = Math.floor(realElapsedMs / 60000);

    setSummary({ sessionId: session.id, name: session.name, totalSets, totalVolume: volume, prCount, durationMin });
    toast.success("Séance enregistrée !");
    setEnding(false);
  }

  const totalSets = Object.values(sets).reduce((acc, s) => acc + s.length, 0);

  // ─── Écran de fin ────────────────────────────────────────────

  if (summary) {
    const h = Math.floor(summary.durationMin / 60);
    const m = summary.durationMin % 60;
    const durationStr = h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${summary.durationMin} min`;

    return (
      <>
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-900/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-900/15 blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] text-center px-6 max-w-sm mx-auto gap-6">
          <div>
            <p className="text-4xl mb-3">💪</p>
            <h1 className="text-xl font-bold text-white">Séance terminée !</h1>
            <p className="text-sm text-zinc-500 mt-1">{summary.name}</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            {[
              { label: "Durée",   value: durationStr },
              { label: "Séries",  value: summary.totalSets.toString() },
              { label: "Volume",  value: summary.totalVolume >= 1000
                  ? `${(summary.totalVolume / 1000).toFixed(1)} t`
                  : summary.totalVolume > 0
                    ? `${Number.isInteger(summary.totalVolume) ? summary.totalVolume : summary.totalVolume.toFixed(1)} kg`
                    : "—"
              },
              { label: "Records", value: summary.prCount > 0 ? `${summary.prCount} 🏆` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="border border-zinc-800 bg-zinc-900/60 rounded-xl px-4 py-3">
                <p className="text-[11px] text-zinc-600 mb-1">{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {summary.prCount > 0 && (
            <p className="text-sm text-yellow-400 font-medium">
              {summary.prCount} nouveau{summary.prCount > 1 ? "x" : ""} record{summary.prCount > 1 ? "s" : ""} battu{summary.prCount > 1 ? "s" : ""} 🔥
            </p>
          )}

          <button
            onClick={() => router.push(`/sessions/${summary.sessionId}`)}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-orange-900/20"
          >
            Voir le récap complet
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </>
    );
  }

  // ─── Séance en cours ─────────────────────────────────────────

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-4 max-w-lg mx-auto pb-36">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">{session.name}</h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              {totalSets} série{totalSets !== 1 ? "s" : ""} enregistrée{totalSets !== 1 ? "s" : ""}
            </p>
          </div>
          <SessionTimer startedAt={workoutStartRef.current} />
        </div>

        {/* Exercices */}
        <div className="space-y-3">
          {slots.map((slot) => {
            const exerciseSets = sets[slot.exercise_id] ?? [];
            const input        = inputs[slot.exercise_id];
            const prev         = lastSets[slot.exercise_id] ?? [];
            const mode         = slot.tracking_mode;
            const sw           = stopwatches[slot.exercise_id] ?? IDLE_SW;

            // PR : compare poids ou durée selon le mode
            const prevBest = mode === "reps"
              ? (bestWeights[slot.exercise_id]  ?? 0)
              : (bestDurations[slot.exercise_id] ?? 0);

            const currentBest = mode === "reps"
              ? Math.max(0, ...exerciseSets.map((s) => s.weight_kg        ?? 0))
              : Math.max(0, ...exerciseSets.map((s) => s.duration_seconds ?? 0));

            const hasPR   = currentBest > 0 && currentBest > prevBest;
            const restLeft  = restTimers[slot.exercise_id] ?? 0;
            const restTotal = slot.rest_seconds ?? 90;

            // Bouton ✓ : désactivé selon le mode ou si chrono actif
            const timerActive = sw.running || sw.paused;
            const canLog = !timerActive && (mode === "reps"
              ? Boolean(input?.reps)
              : mode === "duration"
                ? Boolean(input?.duration)
                : Boolean(input?.reps && input?.duration));

            return (
              <div key={slot.exercise_id} className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden">

                {/* En-tête exercice */}
                <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{slot.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {slot.muscle_group && (
                        <span className="text-[10px] text-zinc-600">
                          {MUSCLE_LABEL[slot.muscle_group as MuscleGroup] ?? slot.muscle_group}
                        </span>
                      )}
                      <TrackingModeBadge mode={mode} />
                    </div>
                  </div>
                  {hasPR && (
                    <span className="bg-yellow-500/15 text-yellow-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-yellow-500/25 shrink-0">
                      🏆 PR
                    </span>
                  )}
                </div>

                {/* Dernière fois */}
                {prev.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1.5">Dernière fois</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prev.map((s) => (
                        <span key={s.id} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-md">
                          {formatSetDisplay(mode, { reps: s.reps, weight_kg: s.weight_kg ? Number(s.weight_kg) : null, duration_seconds: s.duration_seconds })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tableau des séries enregistrées */}
                {exerciseSets.length > 0 && (
                  <div className="px-4 pt-3">
                    <SetTable
                      mode={mode}
                      sets={exerciseSets}
                      prevSets={prev}
                      prevBest={prevBest}
                      onDelete={(setId) => handleDeleteSet(slot.exercise_id, setId)}
                    />
                  </div>
                )}

                {/* Minuteur de repos */}
                {restLeft > 0 && (
                  <div className="mx-4 my-3 bg-zinc-800/80 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Repos</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-white">
                          {String(Math.floor(restLeft / 60)).padStart(2, "0")}:{String(restLeft % 60).padStart(2, "0")}
                        </span>
                        <button
                          onClick={() => setRestTimers((prev) => ({ ...prev, [slot.exercise_id]: 0 }))}
                          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Passer
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-1000"
                        style={{ width: `${(restLeft / restTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Formulaire nouvelle série */}
                <div className="px-4 py-4 space-y-3">

                  {/* ── En-tête série : numéro + hint dernière séance ── */}
                  {(() => {
                    const setIdx  = exerciseSets.length;       // index du prochain set (0-based)
                    const prevSet = prev[setIdx];               // set correspondant de la dernière séance
                    const lastSet = exerciseSets[setIdx - 1];  // dernier set enregistré cette séance

                    return (
                      <div className="flex items-center justify-between min-h-[20px]">
                        <p className="text-xs text-zinc-500">Série #{setIdx + 1}</p>

                        <div className="flex items-center gap-2">
                          {/* Hint : set correspondant de la dernière séance */}
                          {prevSet && (
                            <>
                              <span className="text-[10px] text-zinc-600">
                                Préc. {formatSetDisplay(mode, {
                                  reps:             prevSet.reps,
                                  weight_kg:        prevSet.weight_kg        != null ? Number(prevSet.weight_kg)        : null,
                                  duration_seconds: prevSet.duration_seconds != null ? Number(prevSet.duration_seconds) : null,
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() => fillFromSet(slot.exercise_id, prevSet)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Copier
                              </button>
                            </>
                          )}

                          {/* Quick-repeat : reprendre le dernier set de la séance en cours */}
                          {!prevSet && lastSet && (
                            <button
                              type="button"
                              onClick={() => fillFromSet(slot.exercise_id, lastSet)}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              ↩ Même valeurs
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── MODE REPS (musculation / poids de corps) ── */}
                  {mode === "reps" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Poids (optionnel) */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-600 text-center uppercase tracking-wide">Poids (kg)</span>
                          <div className="flex items-center gap-1">
                            <Stepper
                              onClick={() => updateInput(slot.exercise_id, "weight",
                                String(Math.max(0, (parseFloat(input?.weight || "0") || 0) - 2.5))
                              )}
                              label="−"
                              disabled={(parseFloat(input?.weight || "0") || 0) <= 0}
                            />
                            <input
                              type="number" inputMode="decimal" placeholder="PDC"
                              value={input?.weight ?? ""}
                              onChange={(e) => updateInput(slot.exercise_id, "weight", e.target.value)}
                              autoFocus={slots[0]?.exercise_id === slot.exercise_id && exerciseSets.length === 0}
                              className={numInputCls}
                            />
                            <Stepper onClick={() => updateInput(slot.exercise_id, "weight",
                              String((parseFloat(input?.weight || "0") || 0) + 2.5)
                            )} label="+" />
                          </div>
                        </div>
                        {/* Reps */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-600 text-center uppercase tracking-wide">Reps</span>
                          <div className="flex items-center gap-1">
                            <Stepper
                              onClick={() => updateInput(slot.exercise_id, "reps",
                                String(Math.max(0, (parseInt(input?.reps || "0") || 0) - 1))
                              )}
                              label="−"
                              disabled={(parseInt(input?.reps || "0") || 0) <= 0}
                            />
                            <input
                              type="number" inputMode="numeric" placeholder="—"
                              value={input?.reps ?? ""}
                              onChange={(e) => updateInput(slot.exercise_id, "reps", e.target.value)}
                              className={numInputCls}
                            />
                            <Stepper onClick={() => updateInput(slot.exercise_id, "reps",
                              String((parseInt(input?.reps || "0") || 0) + 1)
                            )} label="+" />
                          </div>
                        </div>
                      </div>
                      <ConfirmButton
                        loading={input?.loading}
                        disabled={!canLog}
                        onClick={() => handleLogSet(slot.exercise_id)}
                        fullWidth
                      />
                    </div>
                  )}

                  {/* ── MODE DURATION ── */}
                  {mode === "duration" && (
                    <div className="space-y-2">
                      <CardioMetricsInputs
                        speed={input?.speed ?? ""}
                        incline={input?.incline ?? ""}
                        onSpeed={(v) => updateInput(slot.exercise_id, "speed", v)}
                        onIncline={(v) => updateInput(slot.exercise_id, "incline", v)}
                      />
                      <DurationInput
                        sw={sw}
                        duration={input?.duration}
                        onStart={() => startStopwatch(slot.exercise_id)}
                        onPause={() => pauseStopwatch(slot.exercise_id)}
                        onResume={() => resumeStopwatch(slot.exercise_id)}
                        onStop={() => stopStopwatch(slot.exercise_id)}
                        onReset={() => resetStopwatch(slot.exercise_id)}
                        onAdjust={(d) => adjustDuration(slot.exercise_id, d)}
                      />
                      {input?.duration && !sw.running && !sw.paused && (
                        <ConfirmButton
                          loading={input?.loading}
                          disabled={!canLog}
                          onClick={() => handleLogSet(slot.exercise_id)}
                          fullWidth
                        />
                      )}
                    </div>
                  )}

                  {/* ── MODE REPS + DURATION (hybride) ── */}
                  {mode === "reps_duration" && (
                    <div className="space-y-3">
                      {/* Reps */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-600 text-center uppercase tracking-wide">Reps</span>
                        <div className="flex items-center gap-1">
                          <Stepper
                            onClick={() => updateInput(slot.exercise_id, "reps",
                              String(Math.max(0, (parseInt(input?.reps || "0") || 0) - 1))
                            )}
                            label="−"
                            disabled={(parseInt(input?.reps || "0") || 0) <= 0}
                          />
                          <input
                            type="number" inputMode="numeric" placeholder="—"
                            value={input?.reps ?? ""}
                            onChange={(e) => updateInput(slot.exercise_id, "reps", e.target.value)}
                            autoFocus={slots[0]?.exercise_id === slot.exercise_id && exerciseSets.length === 0}
                            className={numInputCls}
                          />
                          <Stepper onClick={() => updateInput(slot.exercise_id, "reps",
                            String((parseInt(input?.reps || "0") || 0) + 1)
                          )} label="+" />
                        </div>
                      </div>
                      {/* Durée + confirmer */}
                      <div className="space-y-2">
                        <DurationInput
                          sw={sw}
                          duration={input?.duration}
                          onStart={() => startStopwatch(slot.exercise_id)}
                          onPause={() => pauseStopwatch(slot.exercise_id)}
                          onResume={() => resumeStopwatch(slot.exercise_id)}
                          onStop={() => stopStopwatch(slot.exercise_id)}
                          onReset={() => resetStopwatch(slot.exercise_id)}
                          onAdjust={(d) => adjustDuration(slot.exercise_id, d)}
                        />
                        {input?.duration && !sw.running && !sw.paused && (
                          <ConfirmButton
                            loading={input?.loading}
                            disabled={!canLog}
                            onClick={() => handleLogSet(slot.exercise_id)}
                            fullWidth
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Ajouter un exercice */}
          {available.length > 0 && (
            showPicker ? (
              <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Ajouter un exercice</p>

                {/* Liste des exercices disponibles */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto -mx-1 px-1">
                  {available.map((ex) => {
                    const defaultMode = resolveTrackingMode(ex);
                    const mode        = pickerModes[ex.id] ?? defaultMode;
                    const selected    = pickerSelected === ex.id;

                    return (
                      <div
                        key={ex.id}
                        onClick={() => setPickerSelected(ex.id)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                          selected
                            ? "border-orange-600 bg-orange-600/10"
                            : "border-zinc-800 hover:border-zinc-600 bg-zinc-800/40"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{ex.name}</p>
                          {ex.muscle_group && (
                            <p className="text-[10px] text-zinc-600">
                              {MUSCLE_LABEL[ex.muscle_group as MuscleGroup] ?? ex.muscle_group}
                            </p>
                          )}
                        </div>

                        {/* Sélecteur de mode de suivi */}
                        <div className="flex gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                          {(["reps", "duration", "reps_duration"] as TrackingMode[]).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setPickerModes((prev) => ({ ...prev, [ex.id]: m }));
                                setPickerSelected(ex.id);
                              }}
                              className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                                mode === m
                                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                  : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {m === "reps" ? "Rep" : m === "duration" ? "⏱" : "⏱+"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={confirmPicker}
                    disabled={!pickerSelected}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2 transition-colors"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={closePicker}
                    className="px-4 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg py-2 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openPicker}
                className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                + Ajouter un exercice
              </button>
            )
          )}

          {slots.length === 0 && !showPicker && (
            <p className="text-zinc-600 text-sm text-center py-4">
              Aucun exercice — utilise le bouton ci-dessus pour en ajouter.
            </p>
          )}
        </div>
      </div>

      {/* Barre sticky — terminer */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto space-y-2">
          <textarea
            placeholder="Notes sur la séance (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={1}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none resize-none"
          />
          <button
            onClick={handleEnd}
            disabled={ending || cancelling}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-3 transition-colors"
          >
            {ending ? "Enregistrement…" : `Terminer la séance · ${totalSets} série${totalSets !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={async () => {
              if (!window.confirm("Annuler la séance ? Tous les sets seront supprimés.")) return;
              setCancelling(true);
              await cancelSessionAction(session.id);
              router.replace("/sessions");
            }}
            disabled={ending || cancelling}
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 py-1 transition-colors"
          >
            {cancelling ? "Annulation…" : "Annuler la séance"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Styles partagés ──────────────────────────────────────────

const numInputCls =
  "flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-3 text-white text-center text-xl font-bold placeholder-zinc-700 focus:outline-none focus:border-blue-500 transition-colors";

// ─── Sous-composants ──────────────────────────────────────────

function Stepper({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-10 h-12 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700 rounded-lg text-zinc-300 text-lg font-bold transition-colors shrink-0"
    >
      {label}
    </button>
  );
}

function ConfirmButton({
  loading, disabled, onClick, fullWidth = false,
}: {
  loading?: boolean;
  disabled: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`${fullWidth ? "w-full" : "w-14"} h-12 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xl font-bold rounded-xl transition-colors shrink-0`}
    >
      {loading ? "…" : "✓"}
    </button>
  );
}

/**
 * Inputs optionnels vitesse / inclinaison / résistance pour le cardio.
 */
function CardioMetricsInputs({
  speed, incline, onSpeed, onIncline,
}: {
  speed:     string;
  incline:   string;
  onSpeed:   (v: string) => void;
  onIncline: (v: string) => void;
}) {
  function stepSpeed(delta: number) {
    const v = Math.max(0, Math.round((Number(speed || 0) + delta) * 10) / 10);
    onSpeed(v > 0 ? String(v) : "");
  }
  function stepIncline(delta: number) {
    const v = Math.max(0, Math.min(15, Math.round((Number(incline || 0) + delta) * 10) / 10));
    onIncline(v > 0 ? String(v) : "");
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Vitesse */}
      <div className="bg-zinc-800/40 rounded-xl px-2 py-2 space-y-1">
        <p className="text-[9px] text-zinc-600 uppercase tracking-wide text-center">Vitesse</p>
        <div className="flex items-center justify-between gap-1">
          <button type="button" onClick={() => stepSpeed(-0.5)}
            className="w-6 h-6 text-zinc-400 hover:text-white text-xs rounded transition-colors shrink-0">−</button>
          <input
            type="number" inputMode="decimal" placeholder="—"
            value={speed}
            onChange={(e) => onSpeed(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-center text-sm font-semibold text-white placeholder-zinc-700 focus:outline-none"
          />
          <button type="button" onClick={() => stepSpeed(0.5)}
            className="w-6 h-6 text-zinc-400 hover:text-white text-xs rounded transition-colors shrink-0">+</button>
        </div>
        <p className="text-[9px] text-zinc-700 text-center">km/h</p>
      </div>

      {/* Inclinaison */}
      <div className="bg-zinc-800/40 rounded-xl px-2 py-2 space-y-1">
        <p className="text-[9px] text-zinc-600 uppercase tracking-wide text-center">Inclinaison</p>
        <div className="flex items-center justify-between gap-1">
          <button type="button" onClick={() => stepIncline(-1)}
            className="w-6 h-6 text-zinc-400 hover:text-white text-xs rounded transition-colors shrink-0">−</button>
          <input
            type="number" inputMode="numeric" placeholder="—"
            value={incline}
            onChange={(e) => onIncline(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-center text-sm font-semibold text-white placeholder-zinc-700 focus:outline-none"
          />
          <button type="button" onClick={() => stepIncline(1)}
            className="w-6 h-6 text-zinc-400 hover:text-white text-xs rounded transition-colors shrink-0">+</button>
        </div>
        <p className="text-[9px] text-zinc-700 text-center">/ 15</p>
      </div>
    </div>
  );
}

/**
 * Contrôle de chronomètre pour les exercices basés sur la durée.
 *
 * États :
 *   idle    → bouton Démarrer
 *   running → temps + boutons Pause / Stop
 *   paused  → temps + boutons Reprendre / Stop
 *   stopped → temps + steppers ±5s + bouton Reset
 */
function DurationInput({
  sw, duration, onStart, onPause, onResume, onStop, onReset, onAdjust,
}: {
  sw:       Stopwatch;
  duration: string;
  onStart:  () => void;
  onPause:  () => void;
  onResume: () => void;
  onStop:   () => void;
  onReset:  () => void;
  onAdjust: (delta: number) => void;
}) {
  // ── En cours ──
  if (sw.running) {
    return (
      <div className="space-y-2">
        <p className="font-mono text-3xl font-bold text-white tabular-nums text-center">
          {formatDurationSeconds(sw.elapsed)}
        </p>
        {sw.segments.length > 0 && (
          <p className="text-[10px] text-zinc-600 text-center">
            {sw.segments.length} segment{sw.segments.length > 1 ? "s" : ""} · actif
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPause}
            className="flex-1 h-11 bg-amber-700 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>⏸</span><span>Pause</span>
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex-1 h-11 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>■</span><span>Stop</span>
          </button>
        </div>
      </div>
    );
  }

  // ── En pause ──
  if (sw.paused) {
    return (
      <div className="space-y-2">
        <p className="font-mono text-3xl font-bold text-amber-400 tabular-nums text-center animate-pulse">
          {formatDurationSeconds(sw.elapsed)}
        </p>
        <p className="text-[10px] text-zinc-600 text-center">
          {sw.segments.length} segment{sw.segments.length > 1 ? "s" : ""} · en pause
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResume}
            className="flex-1 h-11 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>▶</span><span>Reprendre</span>
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex-1 h-11 bg-red-700/80 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>■</span><span>Stop</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Arrêté — durée éditable ──
  if (duration) {
    const secs = Number(duration) || 0;

    // Parse "MM:SS" ou secondes brutes → secondes
    function parseInput(raw: string): number {
      const trimmed = raw.trim();
      if (trimmed.includes(":")) {
        const [m, s] = trimmed.split(":").map(Number);
        return Math.max(0, (m || 0) * 60 + (s || 0));
      }
      return Math.max(0, Number(trimmed) || 0);
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onAdjust(-5)}
            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-xs font-bold transition-colors shrink-0">
            −5s
          </button>
          <input
            type="text"
            inputMode="numeric"
            defaultValue={formatDurationSeconds(secs)}
            key={secs}
            onBlur={(e) => {
              const parsed = parseInput(e.target.value);
              onAdjust(parsed - secs);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl text-center font-mono text-2xl font-bold text-white py-2 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button type="button" onClick={() => onAdjust(5)}
            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-xs font-bold transition-colors shrink-0">
            +5s
          </button>
          <button type="button" onClick={onReset}
            className="h-10 px-2 text-zinc-500 hover:text-zinc-300 transition-colors text-lg shrink-0">
            ↺
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 text-center">Tape MM:SS ou modifie avec ±5s</p>
      </div>
    );
  }

  // ── Idle ──
  return (
    <button
      type="button"
      onClick={onStart}
      className="w-full h-12 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
    >
      <span className="text-base">▶</span>
      <span>Démarrer</span>
    </button>
  );
}

function TrackingModeBadge({ mode }: { mode: TrackingMode }) {
  const config = {
    reps:          { label: "Reps",      cls: "text-blue-400/70" },
    duration:      { label: "⏱ Durée",  cls: "text-purple-400/70" },
    reps_duration: { label: "⏱ + Reps", cls: "text-teal-400/70" },
  } as const;
  const c = config[mode];
  return <span className={`text-[10px] ${c.cls}`}>{c.label}</span>;
}

/**
 * Tableau des séries déjà enregistrées, adapté au mode de suivi.
 */
function SetTable({
  mode, sets, prevSets = [], prevBest, onDelete,
}: {
  mode:      TrackingMode;
  sets:      WorkoutSet[];
  prevSets?: WorkoutSet[];
  prevBest:  number;
  onDelete:  (id: string) => void;
}) {
  const isReps     = mode === "reps";
  const isDuration = mode === "duration";
  const gridCls    = isReps || mode === "reps_duration"
    ? "grid-cols-[auto_1fr_1fr_auto_auto]"
    : "grid-cols-[auto_1fr_auto_auto]";

  return (
    <>
      {/* En-têtes */}
      <div className={`grid ${gridCls} text-[10px] text-zinc-600 uppercase tracking-wide mb-1 gap-2`}>
        <span>#</span>
        {isReps          && <><span className="text-center">Reps</span><span className="text-right">Poids</span></>}
        {isDuration      && <span className="text-center">Durée</span>}
        {!isReps && !isDuration && <><span className="text-center">Reps</span><span className="text-right">Durée</span></>}
        <span />  {/* delta */}
        <span />  {/* × */}
      </div>

      {/* Lignes */}
      {sets.map((s, i) => {
        const metricForPR = isReps
          ? (s.weight_kg        ?? 0)
          : (s.duration_seconds ?? 0);
        const isSetPR = metricForPR > 0 && prevBest > 0 && metricForPR > prevBest;
        const prCls   = isSetPR ? "text-yellow-400" : "";

        // Delta vs la même série de la dernière séance
        const matchPrev   = prevSets[i];
        const deltaLabel  = (() => {
          if (!matchPrev) return null;
          if (isReps) {
            const curr = s.weight_kg        != null ? Number(s.weight_kg)        : null;
            const prev = matchPrev.weight_kg != null ? Number(matchPrev.weight_kg) : null;
            if (curr === null || prev === null) {
              // Comparer les reps si pas de poids
              const dr = (s.reps ?? 0) - (matchPrev.reps ?? 0);
              if (dr === 0) return { label: "=",            cls: "text-zinc-600" };
              if (dr  > 0) return { label: `+${dr}`,       cls: "text-green-500" };
              return               { label: `${dr}`,        cls: "text-red-500"   };
            }
            const dw = curr - prev;
            if (dw === 0) return { label: "=",              cls: "text-zinc-600" };
            if (dw  > 0) return { label: `+${dw} kg`,      cls: "text-green-500" };
            return               { label: `${dw} kg`,       cls: "text-red-500"   };
          } else {
            const curr = s.duration_seconds        ?? 0;
            const prev = matchPrev.duration_seconds ?? 0;
            const d    = curr - prev;
            if (d === 0) return { label: "=",               cls: "text-zinc-600" };
            if (d  > 0) return { label: `+${d}s`,           cls: "text-green-500" };
            return               { label: `${d}s`,           cls: "text-red-500"   };
          }
        })();

        return (
          <div key={s.id} className={`grid ${gridCls} items-center gap-2 py-1.5 border-t border-zinc-800/50 text-xs`}>
            <span className={isSetPR ? "text-yellow-400" : "text-zinc-500"}>#{s.set_number}</span>

            {isReps && (
              <>
                <span className={`text-center ${prCls || "text-white"}`}>{s.reps ?? "—"}</span>
                <span className={`text-right font-medium ${prCls || "text-white"}`}>
                  {s.weight_kg ? `${s.weight_kg} kg` : "PDC"}{isSetPR ? " 🏆" : ""}
                </span>
              </>
            )}

            {isDuration && (
              <div className="text-center">
                <span className={`font-medium ${prCls || "text-white"}`}>
                  {s.duration_seconds != null ? formatDurationSeconds(s.duration_seconds) : "—"}{isSetPR ? " 🏆" : ""}
                </span>
                {(s.speed_kmh || s.incline_pct) && (
                  <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">
                    {s.speed_kmh   ? `${s.speed_kmh} km/h` : ""}
                    {s.speed_kmh && s.incline_pct ? " · " : ""}
                    {s.incline_pct ? `incl. ${s.incline_pct}` : ""}
                  </p>
                )}
              </div>
            )}

            {!isReps && !isDuration && (
              <>
                <span className={`text-center ${prCls || "text-white"}`}>{s.reps ?? "—"}</span>
                <span className={`text-right font-medium ${prCls || "text-white"}`}>
                  {s.duration_seconds != null ? formatDurationSeconds(s.duration_seconds) : "—"}{isSetPR ? " 🏆" : ""}
                </span>
              </>
            )}

            {/* Delta vs dernière séance */}
            <span className={`text-right text-[10px] ${deltaLabel?.cls ?? ""}`}>
              {deltaLabel?.label ?? ""}
            </span>

            <button
              onClick={() => onDelete(s.id)}
              className="text-zinc-700 hover:text-red-400 transition-colors text-base leading-none px-1"
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}

// ─── Timer de séance ──────────────────────────────────────────

function SessionTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div className="text-right shrink-0">
      <p className="text-[10px] text-zinc-600 mb-0.5">Durée</p>
      <p className="font-mono text-lg font-semibold text-white">
        {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </p>
    </div>
  );
}
