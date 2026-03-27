import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/push";

// Cron Vercel : tourne chaque soir à 20h
// vercel.json → { "crons": [{ "path": "/api/cron/streak", "schedule": "0 20 * * *" }] }

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service role pour lire toutes les données
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // à ajouter dans .env.local
    { auth: { persistSession: false } }
  );

  // Récupère les utilisateurs avec une subscription push
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subs?.length) return NextResponse.json({ skipped: true });

  const today = new Date().toISOString().slice(0, 10);
  const userIds = [...new Set(subs.map((s) => s.user_id))];

  // Vérifie qui n'a pas fait de séance aujourd'hui mais en a fait une hier
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("user_id, started_at")
    .in("user_id", userIds)
    .not("ended_at", "is", null)
    .gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString());

  const byUser = new Map<string, string[]>();
  for (const s of sessions ?? []) {
    const uid  = s.user_id;
    const date = s.started_at.slice(0, 10);
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(date);
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let notified = 0;
  for (const sub of subs) {
    const dates    = byUser.get(sub.user_id) ?? [];
    const hasToday = dates.includes(today);
    const hasYesterday = dates.some((d) => d === yesterday);

    // Streak en danger : séance hier mais pas aujourd'hui
    if (hasYesterday && !hasToday) {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: "🔥 Streak en danger !",
            body:  "Tu n'as pas encore fait de séance aujourd'hui. Ne brise pas ta série !",
            url:   "/templates",
          }
        );
        notified++;
      } catch {
        // Subscription expirée → supprimer
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  return NextResponse.json({ notified });
}
