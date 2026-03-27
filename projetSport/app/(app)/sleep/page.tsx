import { getDailySleep } from "@/lib/db/sleep";
import { SleepTracker } from "@/components/sleep/SleepTracker";

export default async function SleepPage() {
  const sleepData = await getDailySleep(30);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-900/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-white">Suivi du sommeil</h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Enregistre tes nuits pour optimiser récupération et performance
          </p>
        </div>

        <SleepTracker initial={sleepData} />
      </div>
    </>
  );
}
