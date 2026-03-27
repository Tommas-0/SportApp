import { getBadgeData } from "@/lib/db/badges";
import { computeBadges, CATEGORY_ORDER, CATEGORY_LABEL } from "@/lib/utils/badges";
import type { Badge, BadgeCategory } from "@/lib/utils/badges";

export default async function BadgesPage() {
  const data   = await getBadgeData();
  const badges = computeBadges(data);

  const earned = badges.filter((b) => b.earned).length;
  const total  = badges.length;

  const byCategory = CATEGORY_ORDER.reduce<Record<BadgeCategory, Badge[]>>(
    (acc, cat) => {
      acc[cat] = badges.filter((b) => b.category === cat);
      return acc;
    },
    {} as Record<BadgeCategory, Badge[]>
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto pb-12">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-white">Badges</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{earned} / {total} débloqués</p>
          <div className="mt-2.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all"
              style={{ width: `${(earned / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Catégories */}
        {CATEGORY_ORDER.map((cat) => {
          const catBadges = byCategory[cat];
          const catEarned = catBadges.filter((b) => b.earned).length;

          return (
            <section key={cat}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] text-zinc-500 uppercase tracking-wide">{CATEGORY_LABEL[cat]}</h2>
                <span className="text-[11px] text-zinc-700">{catEarned}/{catBadges.length}</span>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
                {catBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${badge.earned ? "" : "opacity-40"}`}>
      <span className={`text-xl shrink-0 ${badge.earned ? "" : "grayscale"}`}>{badge.icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${badge.earned ? "text-white" : "text-zinc-400"}`}>{badge.name}</p>
          {badge.earned && (
            <span className="bg-yellow-500/15 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-500/25">
              ✓
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{badge.description}</p>

        {badge.progress && !badge.earned && (
          <div className="mt-1.5">
            <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(badge.progress.current / badge.progress.target) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">{badge.progress.current} / {badge.progress.target}</p>
          </div>
        )}
      </div>
    </div>
  );
}
