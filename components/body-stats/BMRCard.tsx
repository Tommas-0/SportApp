"use client";

import { useState, useTransition } from "react";
import {
  calculateBMR,
  ACTIVITY_LABELS,
  type Gender,
  type ActivityLevel,
} from "@/lib/utils/fitness";
import { saveBMRProfileAction } from "@/app/actions/user-settings";
import type { BMRProfile } from "@/lib/db/user-settings";

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary", "light", "moderate", "active", "very_active",
];

export function BMRCard({
  weightKg,
  heightCm,
  initialProfile,
}: {
  weightKg: number;
  heightCm: number;
  initialProfile: BMRProfile | null;
}) {
  const [profile,  setProfile]  = useState<BMRProfile | null>(initialProfile);
  const [editing,  setEditing]  = useState(false);
  const [ageRaw,   setAgeRaw]   = useState("");
  const [gender,   setGender]   = useState<Gender>("male");
  const [pending,  startTransition] = useTransition();

  function openEdit() {
    setAgeRaw(profile ? String(profile.age) : "");
    setGender(profile?.gender ?? "male");
    setEditing(true);
  }

  function saveProfile() {
    const age = parseInt(ageRaw, 10);
    if (!age || age <= 0 || age > 120) return;
    const updated: BMRProfile = {
      age,
      gender,
      activityLevel: profile?.activityLevel ?? "moderate",
    };
    startTransition(async () => {
      await saveBMRProfileAction(updated);
      setProfile(updated);
      setEditing(false);
    });
  }

  function changeActivity(level: ActivityLevel) {
    if (!profile) return;
    const updated: BMRProfile = { ...profile, activityLevel: level };
    setProfile(updated);
    startTransition(() => saveBMRProfileAction(updated));
  }

  // ─── Pas encore de profil ─────────────────────────────────
  if (!profile && !editing) {
    return (
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">Métabolisme de base (BMR)</p>
        <p className="text-xs text-zinc-500 mb-3">
          Renseigne ton âge et ton sexe pour calculer ton métabolisme de base.
        </p>
        <button
          onClick={openEdit}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
        >
          Configurer mon profil
        </button>
      </div>
    );
  }

  // ─── Formulaire ───────────────────────────────────────────
  if (editing) {
    return (
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Profil BMR</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Âge</p>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Ex : 28"
              value={ageRaw}
              onChange={(e) => setAgeRaw(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Sexe</p>
            <div className="flex rounded-lg overflow-hidden border border-zinc-700">
              {(["male", "female"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2 text-sm transition-colors ${
                    gender === g
                      ? "bg-orange-600 text-white font-medium"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {g === "male" ? "Homme" : "Femme"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveProfile}
            disabled={!ageRaw || parseInt(ageRaw) <= 0 || pending}
            className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            {pending ? "Sauvegarde…" : "Enregistrer"}
          </button>
          {profile && (
            <button
              onClick={() => setEditing(false)}
              className="px-4 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-2 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Affichage résultat ───────────────────────────────────
  const { bmr, tdee } = calculateBMR(weightKg, heightCm, profile!.age, profile!.gender);
  const currentTDEE   = tdee[profile!.activityLevel];
  const stepsFor10pct = Math.round((bmr * 0.1) / (weightKg * 0.0006));

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Métabolisme de base (BMR)</p>
        <button
          onClick={openEdit}
          className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"/>
          </svg>
          Modifier
        </button>
      </div>

      {/* BMR + TDEE actuel */}
      <div className="text-center py-2">
        <p className="text-4xl font-bold text-white">{currentTDEE.toLocaleString("fr-FR")}</p>
        <p className="text-sm text-orange-400 mt-1 font-medium">kcal / jour (TDEE)</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          BMR {bmr.toLocaleString("fr-FR")} kcal · {profile!.gender === "male" ? "Homme" : "Femme"} · {profile!.age} ans ·{" "}
          {weightKg} kg · {heightCm} cm
        </p>
        {pending && <p className="text-[10px] text-zinc-600 mt-1">Sauvegarde…</p>}
      </div>

      {/* Sélecteur d'activité */}
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">Niveau d'activité → TDEE</p>
        <div className="space-y-1.5">
          {ACTIVITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => changeActivity(level)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                profile!.activityLevel === level
                  ? "bg-orange-600/15 border border-orange-600/40 text-white"
                  : "bg-zinc-800/60 border border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-left leading-tight">{ACTIVITY_LABELS[level]}</span>
              <span className={`font-semibold shrink-0 ml-3 ${profile!.activityLevel === level ? "text-orange-400" : "text-zinc-500"}`}>
                {tdee[level].toLocaleString("fr-FR")} kcal
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Comparaison pas */}
      <div className="border-t border-zinc-800 pt-3 space-y-1.5">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-2">Comparaison — pas journaliers</p>
        {[
          { pct: 10, steps: stepsFor10pct },
          { pct: 25, steps: Math.round(stepsFor10pct * 2.5) },
          { pct: 50, steps: Math.round(stepsFor10pct * 5) },
        ].map(({ pct, steps }) => (
          <div key={pct} className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{steps.toLocaleString("fr-FR")} pas</span>
            <div className="flex-1 mx-3 bg-zinc-800 rounded-full h-1">
              <div className="h-1 bg-orange-600/60 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-zinc-500 w-14 text-right">≈ {pct}% du BMR</span>
          </div>
        ))}
        <p className="text-[10px] text-zinc-700 mt-1">
          Les pas s'ajoutent à ton BMR — ton TDEE réel inclut aussi tes séances.
        </p>
      </div>
    </div>
  );
}
