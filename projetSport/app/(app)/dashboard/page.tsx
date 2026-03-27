import { createClient } from "@/lib/supabase/server";
import { getSessions, getOpenSession } from "@/lib/db/sessions";
import { getWeeklyVolume } from "@/lib/db/stats";
import { getSubscriptionAction } from "@/app/actions/push";
import { PushNotifications } from "@/components/pwa/PushNotifications";
import Link from "next/link";
import { getBodyStats } from "@/lib/db/body-stats";
import { getWeeklyEnergyData } from "@/lib/db/energy";
import { getBMRProfile } from "@/lib/db/user-settings";
import { getDailyCalories } from "@/lib/db/calories";
import { DailyEnergyCard } from "@/components/dashboard/DailyEnergyCard";

function getMonday(dateStr: string): string {
  const d    = new Date(dateStr + "T12:00:00Z");
  const day  = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function currentStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const todayMonday = getMonday(new Date().toISOString().slice(0, 10));
  const lastMonday  = (() => {
    const d = new Date(todayMonday + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const weeks     = new Set(dates.map(getMonday));
  const startWeek = weeks.has(todayMonday) ? todayMonday : weeks.has(lastMonday) ? lastMonday : null;
  if (!startWeek) return 0;
  let streak = 0, expected = startWeek;
  for (const w of [...weeks].sort().reverse()) {
    if (w === expected) {
      streak++;
      const d = new Date(expected + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - 7);
      expected = d.toISOString().slice(0, 10);
    } else if (w < expected) break;
  }
  return streak;
}

function getWeekDays(sessions: { started_at: string }[]): boolean[] {
  const todayMonday = getMonday(new Date().toISOString().slice(0, 10));
  const days: boolean[] = Array(7).fill(false);
  for (const s of sessions) {
    const date = s.started_at.slice(0, 10);
    if (getMonday(date) !== todayMonday) continue;
    days[(new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7] = true;
  }
  return days;
}

function formatDuration(started: string, ended: string | null) {
  if (!ended) return "en cours";
  const min = Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 60000);
  const h   = Math.floor(min / 60);
  return h > 0 ? `${h}h${String(min % 60).padStart(2, "0")}` : `${min} min`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatVolume(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${v} kg`;
}

function daysSince(iso: string) {
  const today      = new Date().toISOString().slice(0, 10);
  const sessionDay = iso.slice(0, 10);
  const diffMs = new Date(today + "T12:00:00Z").getTime() - new Date(sessionDay + "T12:00:00Z").getTime();
  return Math.floor(diffMs / 86_400_000);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: templateCount }, allSessions, openSession, weeklyVolume, savedEndpoint, bodyStats] = await Promise.all([
    supabase.from("workout_templates").select("*", { count: "exact", head: true }),
    getSessions(),
    getOpenSession(),
    getWeeklyVolume(),
    getSubscriptionAction(),
    getBodyStats(),
  ]);

  const latestWeight = bodyStats.find((s) => s.weight_kg != null)?.weight_kg ?? 75;
  const latestHeight = bodyStats.find((s) => s.height_cm != null)?.height_cm ?? null;
  const [weeklyEnergyData, bmrProfile, recentCalories] = await Promise.all([
    getWeeklyEnergyData(Number(latestWeight), 7),
    getBMRProfile(),
    getDailyCalories(7),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayIngestedKcal = recentCalories.find((c) => c.date === today)?.kcal_ingested ?? null;

  const completedSessions = allSessions.filter((s) => s.ended_at);
  const lastSession       = completedSessions[0];
  const thisMonday        = getMonday(new Date().toISOString().slice(0, 10));
  const sessionsThisWeek  = completedSessions.filter(
    (s) => getMonday(s.started_at.slice(0, 10)) === thisMonday
  ).length;
  const streak    = currentStreak(completedSessions.map((s) => s.started_at.slice(0, 10)));
  const weekDays  = getWeekDays(completedSessions);
  const todayIdx  = (new Date().getUTCDay() + 6) % 7;
  const restDays  = lastSession ? daysSince(lastSession.started_at) : null;
  const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <>
      {/* Même fond que le login */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col gap-3 max-w-sm mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Séance ouverte */}
        {openSession && (
          <Link href={`/sessions/active?id=${openSession.id}`}>
            <div className="border border-amber-700/50 bg-amber-950/60 rounded-xl px-4 py-3 flex items-center justify-between hover:border-amber-600 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">{openSession.name}</p>
                  <p className="text-xs text-amber-700 mt-0.5">Séance en cours</p>
                </div>
              </div>
              <span className="text-xs text-amber-500 shrink-0">Reprendre →</span>
            </div>
          </Link>
        )}

        {/* Heatmap semaine */}
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500">Cette semaine</span>
            <span className="text-xs text-zinc-600">
              {sessionsThisWeek} séance{sessionsThisWeek > 1 ? "s" : ""}
              {weeklyVolume > 0 && ` · ${formatVolume(weeklyVolume)}`}
            </span>
          </div>
          <div className="flex gap-1.5">
            {dayLabels.map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`rounded-md py-1.5 flex items-center justify-center text-[11px] font-medium transition-colors ${
                  weekDays[i]
                    ? "bg-orange-600 text-white"
                    : i === todayIdx
                    ? "border border-zinc-600 text-zinc-400"
                    : "bg-zinc-800/60 text-zinc-700"
                }`}>
                  {weekDays[i] ? "✓" : label}
                </div>
              </div>
            ))}
          </div>
          {restDays !== null && (
            <p className="text-[11px] text-zinc-700 mt-2.5 text-center">
              {restDays === 0 ? "Séance faite aujourd'hui" : restDays === 1 ? "Dernière séance hier" : `${restDays} jours sans séance`}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Séances",    value: completedSessions.length.toString() },
            { label: "Streak",     value: `${streak} sem.` },
            { label: "Programmes", value: (templateCount ?? 0).toString() },
          ].map(({ label, value }) => (
            <div key={label} className="border border-zinc-800 bg-zinc-900/60 rounded-xl px-3 py-3 text-center">
              <p className="text-[11px] text-zinc-600 mb-1">{label}</p>
              <p className="text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/templates">
            <button className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-orange-900/20">
              Lancer une séance
            </button>
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/templates/new">
              <button className="w-full border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-300 hover:text-white text-sm rounded-xl py-2.5 transition-colors">
                Nouveau programme
              </button>
            </Link>
            <Link href="/sessions/manual">
              <button className="w-full border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-300 hover:text-white text-sm rounded-xl py-2.5 transition-colors">
                Saisie manuelle
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/sleep">
              <button className="w-full border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-400 hover:text-white text-xs rounded-xl py-2 transition-colors">
                Sommeil
              </button>
            </Link>
            <Link href="/calories">
              <button className="w-full border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-400 hover:text-white text-xs rounded-xl py-2 transition-colors">
                Calories
              </button>
            </Link>
            <Link href="/records">
              <button className="w-full border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-400 hover:text-white text-xs rounded-xl py-2 transition-colors">
                Records
              </button>
            </Link>
          </div>
        </div>

        {/* Énergie */}
        <DailyEnergyCard
          weightKg={Number(latestWeight)}
          heightCm={latestHeight}
          weekData={weeklyEnergyData}
          bmrProfile={bmrProfile}
          todayIngestedKcal={todayIngestedKcal}
        />

        {/* Séances récentes */}
        {completedSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-zinc-600 uppercase tracking-wide">Récent</span>
              <Link href="/sessions" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Voir tout</Link>
            </div>
            <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
              {completedSessions.slice(0, 2).map((s) => (
                <Link key={s.id} href={`/sessions/${s.id}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{s.name}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{formatDuration(s.started_at, s.ended_at)}</p>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0 ml-4">{formatDate(s.started_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <PushNotifications savedEndpoint={savedEndpoint} />

        {completedSessions.length === 0 && !openSession && (
          <div className="text-center py-10">
            <p className="text-white text-sm font-medium">Aucune séance pour l&apos;instant</p>
            <p className="text-zinc-600 text-xs mt-1 mb-5">Lance ta première séance pour commencer.</p>
            <Link href="/templates">
              <button className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors">
                Commencer
              </button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
