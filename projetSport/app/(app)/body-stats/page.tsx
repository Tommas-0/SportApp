import { getBodyStats } from "@/lib/db/body-stats";
import { getBMRProfile } from "@/lib/db/user-settings";
import { BodyStatsCrud } from "@/components/body-stats/BodyStatsCrud";
import { BMRCard } from "@/components/body-stats/BMRCard";
import { calculateBMI } from "@/lib/utils/fitness";

const BMI_COLORS: Record<string, string> = {
  underweight: "text-blue-400",
  normal:      "text-green-400",
  overweight:  "text-amber-400",
  obese:       "text-red-400",
};

export default async function BodyStatsPage() {
  const [stats, bmrProfile] = await Promise.all([getBodyStats(), getBMRProfile()]);
  const latest = stats.find((s) => s.weight_kg && s.height_cm);
  const bmi    = latest ? calculateBMI(Number(latest.weight_kg), Number(latest.height_cm)) : null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-white">Mesures corporelles</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{stats.length} entrée{stats.length > 1 ? "s" : ""}</p>
        </div>

        {/* IMC */}
        {bmi && (
          <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">IMC</p>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${BMI_COLORS[bmi.category]}`}>{bmi.value}</p>
                <p className={`text-xs font-medium mt-0.5 ${BMI_COLORS[bmi.category]}`}>{bmi.label}</p>
              </div>
              <div className="text-right text-[11px] text-zinc-600 space-y-0.5">
                <p>Maigreur &lt; 18.5</p>
                <p>Normal 18.5 – 24.9</p>
                <p>Surpoids 25 – 29.9</p>
                <p>Obésité ≥ 30</p>
              </div>
            </div>
            {bmi.category !== "normal" && (
              <p className="text-[11px] text-zinc-600 mt-3 border-t border-zinc-800 pt-2">
                L&apos;IMC ne distingue pas masse grasse et musculaire — indicatif uniquement.
              </p>
            )}
          </div>
        )}

        {/* BMR */}
        {latest && (
          <BMRCard
            weightKg={Number(latest.weight_kg)}
            heightCm={Number(latest.height_cm)}
            initialProfile={bmrProfile}
          />
        )}

        <BodyStatsCrud initial={stats} />
      </div>
    </>
  );
}
