import { getDailySteps } from "@/lib/db/steps";
import { getBodyStats } from "@/lib/db/body-stats";
import { StepsTracker } from "@/components/steps/StepsTracker";

export default async function StepsPage() {
  const [stepsData, bodyStats] = await Promise.all([
    getDailySteps(30),
    getBodyStats(),
  ]);

  // Poids le plus récent disponible (fallback 70 kg)
  const latestWeight = bodyStats.find((s) => s.weight_kg != null)?.weight_kg ?? 70;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-900/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-white">Pas journaliers</h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Basé sur un poids de {Number(latestWeight).toFixed(1)} kg
          </p>
        </div>

        <StepsTracker
          initial={stepsData}
          weightKg={Number(latestWeight)}
        />
      </div>
    </>
  );
}
