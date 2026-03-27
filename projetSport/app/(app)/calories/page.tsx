import { getDailyCalories, getEnergyBalance } from "@/lib/db/calories";
import { getBodyStats } from "@/lib/db/body-stats";
import { getFitnessGoal } from "@/lib/db/user-settings";
import { CaloriesTracker } from "@/components/calories/CaloriesTracker";

export default async function CaloriesPage() {
  const bodyStats = await getBodyStats();
  const weightKg  = Number(bodyStats.find((s) => s.weight_kg != null)?.weight_kg ?? 70);

  const [caloriesData, energyBalance, fitnessGoal] = await Promise.all([
    getDailyCalories(30),
    getEnergyBalance(weightKg, 30),
    getFitnessGoal(),
  ]);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-900/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-teal-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-white">Calories ingérées</h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Déficit, surplus et conseils selon ton objectif
          </p>
        </div>

        <CaloriesTracker
          initial={caloriesData}
          energyBalance={energyBalance}
          fitnessGoal={fitnessGoal}
        />
      </div>
    </>
  );
}
