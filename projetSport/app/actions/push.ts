"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function subscribePushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Non authentifié" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id:  user.id,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys.p256dh,
      auth:     subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) return { success: false as const, error: error.message };
  revalidatePath("/");
  return { success: true as const };
}

export async function unsubscribePushAction(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Non authentifié" };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function getSubscriptionAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return data?.endpoint ?? null;
}
