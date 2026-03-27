import type { BadgeRawData } from "@/lib/db/badges";

export type BadgeCategory = "régularité" | "force" | "volume" | "corps";

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  earned: boolean;
  /** Pour les badges à seuil : progression actuelle / cible */
  progress?: { current: number; target: number };
};

// ─── Helpers ─────────────────────────────────────────────────

/** Retourne la date du lundi de la semaine d'une date ISO */
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=dim
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Nombre maximum de semaines consécutives avec au moins 1 séance */
function maxConsecutiveWeeks(dates: string[]): number {
  if (!dates.length) return 0;

  const weekSet = new Set(dates.map(getMonday));
  const weeks = [...weekSet].sort();

  let maxStreak = 1;
  let cur = 1;

  for (let i = 1; i < weeks.length; i++) {
    const prev = new Date(weeks[i - 1] + "T12:00:00Z");
    const curr = new Date(weeks[i]     + "T12:00:00Z");
    const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diffDays === 7) {
      cur++;
      if (cur > maxStreak) maxStreak = cur;
    } else {
      cur = 1;
    }
  }

  return maxStreak;
}

/** Nombre maximum de séances dans une même semaine calendaire */
function maxSessionsInOneWeek(dates: string[]): number {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const w = getMonday(d);
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

// ─── Définition des badges ───────────────────────────────────

export function computeBadges(data: BadgeRawData): Badge[] {
  const { totalSessions, sessionDates, maxSessionVolume, totalVolume, maxWeightEver, bodyStatCount, firstWeightKg, latestWeightKg, firstBodyFatPct, latestBodyFatPct } = data;

  const consecutiveWeeks = maxConsecutiveWeeks(sessionDates);
  const bestWeek         = maxSessionsInOneWeek(sessionDates);
  const weightLost       = firstWeightKg && latestWeightKg ? firstWeightKg - latestWeightKg : 0;
  const weightGained     = firstWeightKg && latestWeightKg ? latestWeightKg - firstWeightKg : 0;
  const fatLost          = firstBodyFatPct && latestBodyFatPct ? firstBodyFatPct - latestBodyFatPct : 0;

  const badges: Badge[] = [

    // ── Régularité ──────────────────────────────────────────

    {
      id: "first_session",
      name: "Premier pas",
      description: "Terminer sa première séance.",
      icon: "🏁",
      category: "régularité",
      earned: totalSessions >= 1,
    },
    {
      id: "sessions_10",
      name: "Habitué",
      description: "10 séances terminées.",
      icon: "🔄",
      category: "régularité",
      earned: totalSessions >= 10,
      progress: { current: Math.min(totalSessions, 10), target: 10 },
    },
    {
      id: "sessions_25",
      name: "Assidu",
      description: "25 séances terminées.",
      icon: "💪",
      category: "régularité",
      earned: totalSessions >= 25,
      progress: { current: Math.min(totalSessions, 25), target: 25 },
    },
    {
      id: "sessions_50",
      name: "Demi-centurion",
      description: "50 séances terminées.",
      icon: "🏆",
      category: "régularité",
      earned: totalSessions >= 50,
      progress: { current: Math.min(totalSessions, 50), target: 50 },
    },
    {
      id: "sessions_100",
      name: "Centurion",
      description: "100 séances terminées.",
      icon: "👑",
      category: "régularité",
      earned: totalSessions >= 100,
      progress: { current: Math.min(totalSessions, 100), target: 100 },
    },
    {
      id: "perfect_week",
      name: "Semaine parfaite",
      description: "3 séances ou plus en une seule semaine.",
      icon: "🔥",
      category: "régularité",
      earned: bestWeek >= 3,
    },
    {
      id: "streak_2w",
      name: "Sur la lancée",
      description: "Séances 2 semaines consécutives.",
      icon: "📅",
      category: "régularité",
      earned: consecutiveWeeks >= 2,
      progress: { current: Math.min(consecutiveWeeks, 2), target: 2 },
    },
    {
      id: "streak_4w",
      name: "Mois solide",
      description: "Séances 4 semaines consécutives.",
      icon: "🗓️",
      category: "régularité",
      earned: consecutiveWeeks >= 4,
      progress: { current: Math.min(consecutiveWeeks, 4), target: 4 },
    },
    {
      id: "streak_8w",
      name: "Deux mois sans faille",
      description: "Séances 8 semaines consécutives.",
      icon: "⚡",
      category: "régularité",
      earned: consecutiveWeeks >= 8,
      progress: { current: Math.min(consecutiveWeeks, 8), target: 8 },
    },

    // ── Force ───────────────────────────────────────────────

    {
      id: "weight_60",
      name: "Club des 60 kg",
      description: "Soulever 60 kg ou plus sur un exercice.",
      icon: "🥉",
      category: "force",
      earned: maxWeightEver >= 60,
    },
    {
      id: "weight_100",
      name: "Club des 100 kg",
      description: "Soulever 100 kg ou plus sur un exercice.",
      icon: "🥈",
      category: "force",
      earned: maxWeightEver >= 100,
    },
    {
      id: "weight_140",
      name: "Club des 140 kg",
      description: "Soulever 140 kg ou plus sur un exercice.",
      icon: "🥇",
      category: "force",
      earned: maxWeightEver >= 140,
    },
    {
      id: "weight_180",
      name: "Club des 180 kg",
      description: "Soulever 180 kg ou plus sur un exercice.",
      icon: "💎",
      category: "force",
      earned: maxWeightEver >= 180,
    },

    // ── Volume ──────────────────────────────────────────────

    {
      id: "session_1t",
      name: "1 tonne",
      description: "Dépasser 1 000 kg de volume en une séance.",
      icon: "⚖️",
      category: "volume",
      earned: maxSessionVolume >= 1_000,
    },
    {
      id: "session_2t",
      name: "2 tonnes",
      description: "Dépasser 2 000 kg de volume en une séance.",
      icon: "🏋️",
      category: "volume",
      earned: maxSessionVolume >= 2_000,
    },
    {
      id: "session_5t",
      name: "5 tonnes",
      description: "Dépasser 5 000 kg de volume en une séance.",
      icon: "🚛",
      category: "volume",
      earned: maxSessionVolume >= 5_000,
    },
    {
      id: "total_50t",
      name: "50 tonnes cumulées",
      description: "Atteindre 50 000 kg de volume total.",
      icon: "📦",
      category: "volume",
      earned: totalVolume >= 50_000,
      progress: { current: Math.min(Math.round(totalVolume / 1000), 50), target: 50 },
    },
    {
      id: "total_200t",
      name: "200 tonnes cumulées",
      description: "Atteindre 200 000 kg de volume total.",
      icon: "🌍",
      category: "volume",
      earned: totalVolume >= 200_000,
      progress: { current: Math.min(Math.round(totalVolume / 1000), 200), target: 200 },
    },

    // ── Corps ───────────────────────────────────────────────

    {
      id: "first_measure",
      name: "Première mesure",
      description: "Enregistrer une première mesure corporelle.",
      icon: "📏",
      category: "corps",
      earned: bodyStatCount >= 1,
    },
    {
      id: "measures_10",
      name: "Suivi régulier",
      description: "10 mesures corporelles enregistrées.",
      icon: "📊",
      category: "corps",
      earned: bodyStatCount >= 10,
      progress: { current: Math.min(bodyStatCount, 10), target: 10 },
    },
    {
      id: "lost_2kg",
      name: "-2 kg",
      description: "Perdre 2 kg depuis la première mesure.",
      icon: "📉",
      category: "corps",
      earned: weightLost >= 2,
    },
    {
      id: "lost_5kg",
      name: "-5 kg",
      description: "Perdre 5 kg depuis la première mesure.",
      icon: "🎯",
      category: "corps",
      earned: weightLost >= 5,
    },
    {
      id: "gained_3kg",
      name: "+3 kg de masse",
      description: "Prendre 3 kg depuis la première mesure.",
      icon: "📈",
      category: "corps",
      earned: weightGained >= 3,
    },
    {
      id: "fat_loss_2pct",
      name: "-2% masse grasse",
      description: "Réduire sa masse grasse de 2 points.",
      icon: "🔬",
      category: "corps",
      earned: fatLost >= 2,
    },
  ];

  return badges;
}

export const CATEGORY_ORDER: BadgeCategory[] = ["régularité", "force", "volume", "corps"];

export const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  "régularité": "Régularité",
  "force":      "Force",
  "volume":     "Volume",
  "corps":      "Corps",
};
