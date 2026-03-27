import { getAllTimeRecords, getAllTimeCardioRecords } from "@/lib/db/records";
import Link from "next/link";

const MUSCLE_LABEL: Record<string, string> = {
  chest:     "Pectoraux",
  back:      "Dos",
  shoulders: "Épaules",
  arms:      "Bras",
  legs:      "Jambes",
  glutes:    "Fessiers",
  core:      "Abdos",
  cardio:    "Cardio",
  full_body: "Full body",
  other:     "Autre",
};

const MUSCLE_ORDER = ["chest","back","shoulders","arms","legs","glutes","core","cardio","full_body","other"];

export default async function RecordsPage() {
  const [records, cardioRecords] = await Promise.all([
    getAllTimeRecords(),
    getAllTimeCardioRecords(),
  ]);

  // Grouper par muscle group
  const grouped = records.reduce<Record<string, typeof records>>((acc, r) => {
    const key = r.muscle_group ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const groups = MUSCLE_ORDER
    .filter((k) => grouped[k]?.length)
    .map((k) => ({ key: k, label: MUSCLE_LABEL[k] ?? k, records: grouped[k] }));

  const noGroup = records.filter((r) => !MUSCLE_ORDER.includes(r.muscle_group ?? "other"));
  const totalCount = records.length + cardioRecords.length;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto pb-12">
        <div>
          <h1 className="text-lg font-semibold text-white">Records</h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            {totalCount} exercice{totalCount > 1 ? "s" : ""} avec des données
          </p>
        </div>

        {totalCount === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-2xl py-16 text-center">
            <p className="text-zinc-600 text-sm mb-4">Aucune série enregistrée pour l&apos;instant.</p>
            <Link href="/templates" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Lancer une séance →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">{group.label}</h2>
                <div className="space-y-1.5">
                  {group.records.map((r) => (
                    <RecordCard key={r.exercise_id} record={r} />
                  ))}
                </div>
              </section>
            ))}
            {noGroup.map((r) => (
              <RecordCard key={r.exercise_id} record={r} />
            ))}

            {cardioRecords.length > 0 && (
              <section>
                <h2 className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">Cardio — Meilleure durée</h2>
                <div className="space-y-1.5">
                  {cardioRecords.map((r) => (
                    <Link key={r.exercise_id} href={`/progress?exercise=${r.exercise_id}`}>
                      <div className="border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 rounded-xl px-4 py-3 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{r.name}</p>
                            <p className="text-xs text-zinc-600 mt-0.5">
                              {new Date(r.achieved_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-zinc-600 mb-0.5">Meilleure durée</p>
                            <p className="text-sm font-bold text-orange-400">{r.best_duration_fmt}</p>
                            <p className="text-[10px] text-zinc-600">{r.best_duration_s}s</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function RecordCard({ record }: { record: Awaited<ReturnType<typeof getAllTimeRecords>>[number] }) {
  const date = new Date(record.achieved_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <Link href={`/progress?exercise=${record.exercise_id}`}>
      <div className="border border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 rounded-xl px-4 py-3 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{record.name}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{date}</p>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-right">
            <div>
              <p className="text-[10px] text-zinc-600 mb-0.5">Charge</p>
              <p className="text-sm font-bold text-white">
                {record.best_weight_kg} <span className="text-xs font-normal text-zinc-400">kg</span>
              </p>
              <p className="text-[10px] text-zinc-600">× {record.reps_at_best} reps</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 mb-0.5">1RM estimé</p>
              <p className="text-sm font-bold text-blue-400">
                {record.estimated_1rm} <span className="text-xs font-normal text-blue-600">kg</span>
              </p>
              <p className="text-[10px] text-zinc-600">Epley</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
