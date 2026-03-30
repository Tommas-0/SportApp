"use client";

import { useState } from "react";
import {
  createBodyStatAction,
  updateBodyStatAction,
  deleteBodyStatAction,
} from "@/app/actions/body-stats";
import type { BodyStat } from "@/types";

type FormState = {
  recorded_at: string;
  weight_kg: string; body_fat_pct: string; muscle_mass_kg: string;
  chest_cm: string; waist_cm: string; height_cm: string; hips_cm: string;
  water_ml: string; hydration_pct: string; bone_mass_kg: string; notes: string;
};

const EMPTY_FORM: FormState = {
  recorded_at: new Date().toISOString().slice(0, 10),
  weight_kg: "", body_fat_pct: "", muscle_mass_kg: "",
  chest_cm: "", waist_cm: "", height_cm: "", hips_cm: "",
  water_ml: "", hydration_pct: "", bone_mass_kg: "", notes: "",
};

function statToForm(s: BodyStat): FormState {
  return {
    recorded_at:    s.recorded_at.slice(0, 10),
    weight_kg:      s.weight_kg?.toString()      ?? "",
    body_fat_pct:   s.body_fat_pct?.toString()   ?? "",
    muscle_mass_kg: s.muscle_mass_kg?.toString() ?? "",
    chest_cm:       s.chest_cm?.toString()       ?? "",
    waist_cm:       s.waist_cm?.toString()       ?? "",
    height_cm:      s.height_cm?.toString()      ?? "",
    hips_cm:        s.hips_cm?.toString()        ?? "",
    water_ml:       s.water_ml?.toString()       ?? "",
    hydration_pct:  s.hydration_pct?.toString()  ?? "",
    bone_mass_kg:   s.bone_mass_kg?.toString()   ?? "",
    notes:          s.notes                      ?? "",
  };
}

function formToInput(f: FormState) {
  return {
    recorded_at:    new Date(f.recorded_at).toISOString(),
    weight_kg:      f.weight_kg      ? Number(f.weight_kg)      : null,
    body_fat_pct:   f.body_fat_pct   ? Number(f.body_fat_pct)   : null,
    muscle_mass_kg: f.muscle_mass_kg ? Number(f.muscle_mass_kg) : null,
    chest_cm:       f.chest_cm       ? Number(f.chest_cm)       : null,
    waist_cm:       f.waist_cm       ? Number(f.waist_cm)       : null,
    height_cm:      f.height_cm      ? Number(f.height_cm)      : null,
    hips_cm:        f.hips_cm        ? Number(f.hips_cm)        : null,
    water_ml:       f.water_ml       ? Number(f.water_ml)       : null,
    hydration_pct:  f.hydration_pct  ? Number(f.hydration_pct)  : null,
    bone_mass_kg:   f.bone_mass_kg   ? Number(f.bone_mass_kg)   : null,
    notes:          f.notes || null,
  };
}

const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors";
const labelCls = "block text-[11px] text-zinc-500 uppercase tracking-wide mb-1 break-words";

// ─── Composant principal ──────────────────────────────────────

export function BodyStatsCrud({ initial }: { initial: BodyStat[] }) {
  const [stats,      setStats]      = useState<BodyStat[]>(initial);
  const [mode,       setMode]       = useState<"list" | "add" | "edit">("list");
  const [editing,    setEditing]    = useState<BodyStat | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    const latest = stats[0];
    setForm({ ...EMPTY_FORM, height_cm: latest?.height_cm?.toString() ?? "", bone_mass_kg: latest?.bone_mass_kg?.toString() ?? "" });
    setEditing(null); setError(null); setMode("add");
  }

  function openEdit(stat: BodyStat) {
    setForm(statToForm(stat)); setEditing(stat); setError(null); setMode("edit");
  }

  function cancel() { setMode("list"); setEditing(null); setError(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.weight_kg && !form.body_fat_pct) { setError("Renseigne au moins le poids ou la masse grasse."); return; }
    setError(null); setLoading(true);

    if (mode === "add") {
      const result = await createBodyStatAction(formToInput(form));
      if (!result.success) { setError(result.error); setLoading(false); return; }
      setStats((prev) => [result.data, ...prev]);
    } else if (mode === "edit" && editing) {
      const result = await updateBodyStatAction(editing.id, formToInput(form));
      if (!result.success) { setError(result.error); setLoading(false); return; }
      setStats((prev) => prev.map((s) => (s.id === editing.id ? result.data : s)));
    }
    setLoading(false); setMode("list");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteBodyStatAction(id);
    setDeletingId(null);
    if (!result.success) return;
    setStats((prev) => prev.filter((s) => s.id !== id));
  }

  if (mode === "add" || mode === "edit") {
    return <BodyStatForm form={form} set={set} onSubmit={handleSubmit} onCancel={cancel} loading={loading} error={error} isEdit={mode === "edit"} />;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={openAdd}
        className="w-full border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        + Nouvelle mesure
      </button>

      {stats.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-12">Aucune mesure enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {stats.map((stat) => (
            <StatCard key={stat.id} stat={stat} onEdit={() => openEdit(stat)} onDelete={() => handleDelete(stat.id)} deleting={deletingId === stat.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Carte mesure ─────────────────────────────────────────────

function StatCard({ stat, onEdit, onDelete, deleting }: { stat: BodyStat; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  const date = new Date(stat.recorded_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const metrics = [
    { label: "Poids",       value: stat.weight_kg,      unit: "kg" },
    { label: "Masse grasse",value: stat.body_fat_pct,   unit: "%"  },
    { label: "Masse musc.", value: stat.muscle_mass_kg, unit: "kg" },
    { label: "Taille",      value: stat.height_cm,      unit: "cm" },
    { label: "Poitrine",    value: stat.chest_cm,       unit: "cm" },
    { label: "Tour taille", value: stat.waist_cm,       unit: "cm" },
    { label: "Hanches",     value: stat.hips_cm,        unit: "cm" },
    { label: "Hydratation", value: stat.hydration_pct,  unit: "%"  },
    { label: "Os",          value: stat.bone_mass_kg,   unit: "kg" },
  ].filter((m) => m.value !== null);

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
        <p className="text-xs text-zinc-400 capitalize">{date}</p>
        <div className="flex items-center">
          <button onClick={onEdit} className="text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1">Éditer</button>
          <button onClick={onDelete} disabled={deleting} className="text-xs text-zinc-400 hover:text-red-400 transition-colors px-3 py-1 disabled:opacity-40">
            {deleting ? "…" : "Supprimer"}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        {metrics.map(({ label, value, unit }) => (
          <div key={label} className="bg-zinc-800/60 rounded-lg px-2.5 py-2 min-w-0">
            <p className="text-[10px] text-zinc-600 mb-0.5 truncate">{label}</p>
            <p className="text-sm font-medium text-white truncate">{value} <span className="text-zinc-500 text-xs font-normal">{unit}</span></p>
          </div>
        ))}
      </div>

      {stat.notes && (
        <p className="text-xs text-zinc-600 px-4 pb-3">{stat.notes}</p>
      )}
    </div>
  );
}

// ─── Formulaire ───────────────────────────────────────────────

function Field({ label, value, onChange, type = "number", placeholder, unit }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; unit?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}{unit && <span className="text-zinc-600 normal-case ml-1">({unit})</span>}</label>
      <input type={type} inputMode={type === "number" ? "decimal" : undefined} step="0.1" min="0"
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

function BodyStatForm({ form, set, onSubmit, onCancel, loading, error, isEdit }: {
  form: FormState; set: (f: keyof FormState, v: string) => void;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void;
  loading: boolean; error: string | null; isEdit: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">←</button>
        <h2 className="text-sm font-medium text-white">{isEdit ? "Modifier la mesure" : "Nouvelle mesure"}</h2>
      </div>

      <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-4">
        <Field label="Date" type="date" value={form.recorded_at} onChange={(v) => set("recorded_at", v)} />

        <div>
          <p className={labelCls}>Corps</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Poids"        unit="kg" value={form.weight_kg}      onChange={(v) => set("weight_kg", v)}      placeholder="80.0" />
            <Field label="Masse grasse" unit="%"  value={form.body_fat_pct}   onChange={(v) => set("body_fat_pct", v)}   placeholder="15.0" />
            <Field label="Masse musc."  unit="kg" value={form.muscle_mass_kg} onChange={(v) => set("muscle_mass_kg", v)} placeholder="70.0" />
            <Field label="Masse osseuse" unit="kg" value={form.bone_mass_kg}  onChange={(v) => set("bone_mass_kg", v)}  placeholder="3.5"  />
            <Field label="Taille"        unit="cm" value={form.height_cm}     onChange={(v) => set("height_cm", v)}     placeholder="180"  />
          </div>
        </div>

        <div>
          <p className={labelCls}>Mensurations</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Poitrine" unit="cm" value={form.chest_cm} onChange={(v) => set("chest_cm", v)} placeholder="100" />
            <Field label="Taille"   unit="cm" value={form.waist_cm} onChange={(v) => set("waist_cm", v)} placeholder="80"  />
            <Field label="Hanches"  unit="cm" value={form.hips_cm}  onChange={(v) => set("hips_cm", v)}  placeholder="95"  />
          </div>
        </div>

        <div>
          <p className={labelCls}>Hydratation</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Eau bue"       unit="ml" value={form.water_ml}      onChange={(v) => set("water_ml", v)}      placeholder="2000" />
            <Field label="% hydratation" unit="%"  value={form.hydration_pct} onChange={(v) => set("hydration_pct", v)} placeholder="60.0" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optionnel…" rows={2}
            className={`${inputCls} resize-none`} />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 border border-red-900/50 bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-orange-900/20">
        {loading ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Ajouter la mesure"}
      </button>
    </form>
  );
}
