import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification, type PushPayload } from "@/lib/push";

// Route interne protégée par CRON_SECRET
// POST /api/push/send
// Body: { subscriptions: [...], payload: { title, body, url? } }

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscriptions, payload }: {
    subscriptions: { endpoint: string; p256dh: string; auth: string }[];
    payload: PushPayload;
  } = await req.json();

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed });
}
